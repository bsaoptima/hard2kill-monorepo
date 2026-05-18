#include <amxmodx>
#include <amxmisc>
#include <cstrike>
#include <fun>
#include <hamsandwich>

#define PLUGIN  "H2K Deathmatch"
#define VERSION "3.1"
#define AUTHOR  "Hard2Kill"

new g_killLimit = 10
new g_timeLimit = 180
new g_matchStartTime
new g_betPerKill = 1

new g_kills[33]
new g_playerCount
new g_playerNames[33][32]

// Per-slot H2K identifiers (populated from userinfo on client_putinserver)
new g_token[33][192]      // HMAC-signed match token (opaque to plugin, verified by sidecar)
new g_matchId[64]         // shared across all players in the match — taken from first joiner's setinfo

enum MatchState {
    STATE_WAITING,
    STATE_COUNTDOWN,
    STATE_ACTIVE,
    STATE_ENDED
}
new MatchState:g_state = STATE_WAITING
new g_countdownTimer

// Alternating team assignment so 1v1 matches always have one T and one CT
new CsTeams:g_nextTeam = CS_TEAM_T

// Files — AMX fopen resolves relative to cstrike/addons/amxmodx/data/
// Symlinks from /xashds/cstrike/addons/amxmodx/data/<file> → /xashds/public/<file> expose them via HTTP
new const STATE_FILE[] = "h2k_state.json"        // overwritten every tick — live match state for overlay poll
new const EVENTS_FILE[] = "h2k_events.jsonl"     // append-only — sidecar tails and POSTs to H2K

public plugin_init() {
    register_plugin(PLUGIN, VERSION, AUTHOR)

    register_event("DeathMsg", "event_death", "a")
    RegisterHam(Ham_Spawn, "player", "event_spawn", 1)

    register_cvar("h2k_kill_limit", "10")
    register_cvar("h2k_time_limit", "180")
    register_cvar("h2k_bet_per_kill", "1")

    set_cvar_num("mp_buytime", 0)
    set_cvar_num("mp_respawndelay", 0)
    set_cvar_num("mp_forcerespawn", 1)
    set_cvar_num("mp_timelimit", 0)
    set_cvar_num("mp_roundtime", 9)
    set_cvar_num("mp_freezetime", 0)
    set_cvar_num("mp_startmoney", 16000)
    set_cvar_num("mp_friendlyfire", 0)
    set_cvar_num("mp_autoteambalance", 0)
    set_cvar_num("mp_limitteams", 0)

    // Update state file every second
    set_task(1.0, "write_state", _, _, _, "b")

    // Write initial state
    write_state()

    server_print("[H2K] Deathmatch v%s loaded", VERSION)
}

// ==================== STATE FILE ====================

public write_state() {
    new file = fopen(STATE_FILE, "w")
    if (!file) return

    new elapsed = 0
    new remaining = g_timeLimit
    if (g_state == STATE_ACTIVE) {
        elapsed = get_systime() - g_matchStartTime
        remaining = g_timeLimit - elapsed
        if (remaining < 0) remaining = 0
    }

    new stateStr[16]
    switch (g_state) {
        case STATE_WAITING: copy(stateStr, charsmax(stateStr), "waiting")
        case STATE_COUNTDOWN: copy(stateStr, charsmax(stateStr), "countdown")
        case STATE_ACTIVE: copy(stateStr, charsmax(stateStr), "active")
        case STATE_ENDED: copy(stateStr, charsmax(stateStr), "ended")
    }

    // Build players JSON array
    new playersJson[512]
    new pos = 0
    new first = true
    pos += formatex(playersJson[pos], charsmax(playersJson) - pos, "[")

    for (new i = 1; i <= 32; i++) {
        if (!is_user_connected(i)) continue
        new name[32]
        get_user_name(i, name, charsmax(name))

        if (!first) {
            pos += formatex(playersJson[pos], charsmax(playersJson) - pos, ",")
        }
        first = false

        pos += formatex(playersJson[pos], charsmax(playersJson) - pos, "{^"name^":^"%s^",^"kills^":%d,^"id^":%d}", name, g_kills[i], i)
    }
    pos += formatex(playersJson[pos], charsmax(playersJson) - pos, "]")

    // Write JSON
    fprintf(file, "{")
    fprintf(file, "^"state^":^"%s^",", stateStr)
    fprintf(file, "^"killLimit^":%d,", g_killLimit)
    fprintf(file, "^"timeLimit^":%d,", g_timeLimit)
    fprintf(file, "^"remaining^":%d,", remaining)
    fprintf(file, "^"betPerKill^":%d,", g_betPerKill)
    fprintf(file, "^"countdown^":%d,", g_countdownTimer)
    fprintf(file, "^"players^":%s", playersJson)
    fprintf(file, "}")

    fclose(file)

    // Check time limit while we're here
    if (g_state == STATE_ACTIVE && remaining <= 0) {
        end_match_by_time()
    }
}

// ==================== PLAYER EVENTS ====================

public client_putinserver(id) {
    g_kills[id] = 0
    g_playerCount = get_playersnum()
    get_user_name(id, g_playerNames[id], charsmax(g_playerNames[]))

    // Read H2K userinfo set by the React wrapper via Cmd_ExecuteString('setinfo …')
    get_user_info(id, "token", g_token[id], charsmax(g_token[]))

    // First player to arrive sets the match id for everyone in this match.
    if (g_matchId[0] == 0) {
        get_user_info(id, "matchid", g_matchId, charsmax(g_matchId))
    }

    server_print("[H2K] Player connected: %s (slot %d, total: %d, matchId: %s)",
        g_playerNames[id], id, g_playerCount, g_matchId)
    write_state()

    // Skip the team/class menu — force-join alternating team + spawn after a short delay
    // (delay lets the connect handshake settle before we yank them onto a team)
    set_task(0.5, "auto_join_team", id)

    if (g_playerCount >= 2 && g_state == STATE_WAITING) {
        start_countdown()
    }
}

public auto_join_team(id) {
    if (!is_user_connected(id)) return
    new CsTeams:assigned = g_nextTeam
    cs_set_user_team(id, assigned)
    cs_set_user_model(id, assigned == CS_TEAM_T ? "leet" : "urban")
    g_nextTeam = (assigned == CS_TEAM_T) ? CS_TEAM_CT : CS_TEAM_T
    ExecuteHamB(Ham_CS_RoundRespawn, id)
}

public client_disconnected(id) {
    g_kills[id] = 0
    g_playerCount = get_playersnum() - 1

    if (g_state == STATE_ACTIVE && g_playerCount < 2) {
        new winner_slot = 0
        for (new i = 1; i <= 32; i++) {
            if (is_user_connected(i) && i != id) {
                new name[32]
                get_user_name(i, name, charsmax(name))
                server_print("[H2K] === MATCH RESULT === Winner: %s (opponent disconnected) ===", name)
                winner_slot = i
                break
            }
        }
        append_match_end_event(winner_slot, id, "forfeit")
        end_match()
    }
    write_state()

    // Clear slot state
    g_token[id][0] = 0
}

// ==================== SPAWN ====================

public event_spawn(id) {
    if (!is_user_alive(id)) return
    set_task(0.1, "give_weapons", id)
}

public give_weapons(id) {
    if (!is_user_alive(id)) return
    strip_user_weapons(id)
    give_item(id, "weapon_knife")
    give_item(id, "weapon_ak47")
    give_item(id, "weapon_deagle")
    give_item(id, "weapon_hegrenade")
    cs_set_user_bpammo(id, CSW_AK47, 200)
    cs_set_user_bpammo(id, CSW_DEAGLE, 100)
    cs_set_user_armor(id, 100, CS_ARMOR_VESTHELM)
}

// ==================== KILL EVENT ====================

public event_death() {
    if (g_state != STATE_ACTIVE) return

    new killer = read_data(1)
    new victim = read_data(2)
    if (killer == victim || killer == 0) return

    g_kills[killer]++

    new killer_name[32], victim_name[32]
    get_user_name(killer, killer_name, charsmax(killer_name))
    get_user_name(victim, victim_name, charsmax(victim_name))

    server_print("[H2K] Kill: %s killed %s (%d/%d)", killer_name, victim_name, g_kills[killer], g_killLimit)

    // Chat messages
    new msg[128]
    formatex(msg, charsmax(msg), "%s: %d | %s: %d (first to %d)", killer_name, g_kills[killer], victim_name, g_kills[victim], g_killLimit)
    client_print(0, print_chat, msg)

    // Write state immediately on kill
    write_state()

    // Check win
    if (g_kills[killer] >= g_killLimit) {
        server_print("[H2K] === MATCH RESULT === Winner: %s with %d kills ===", killer_name, g_kills[killer])
        client_print(0, print_chat, "*** MATCH OVER! %s WINS! ***", killer_name)
        client_print(0, print_center, "MATCH OVER!")
        append_match_end_event(killer, victim, "killlimit")
        end_match()
        return
    }

    set_task(1.0, "respawn_player", victim)
}

public respawn_player(id) {
    if (!is_user_connected(id) || is_user_alive(id)) return
    ExecuteHamB(Ham_CS_RoundRespawn, id)
}

// ==================== MATCH FLOW ====================

public start_countdown() {
    g_state = STATE_COUNTDOWN
    g_countdownTimer = 5
    write_state()
    set_task(1.0, "countdown_tick", _, _, _, "a", 5)
}

public countdown_tick() {
    g_countdownTimer--
    write_state()
    if (g_countdownTimer <= 0) {
        start_match()
    }
}

public start_match() {
    g_state = STATE_ACTIVE
    g_matchStartTime = get_systime()
    g_killLimit = get_cvar_num("h2k_kill_limit")
    g_timeLimit = get_cvar_num("h2k_time_limit")
    g_betPerKill = get_cvar_num("h2k_bet_per_kill")

    for (new i = 1; i <= 32; i++) {
        g_kills[i] = 0
    }

    server_print("[H2K] === MATCH STARTED === First to %d kills ===", g_killLimit)
    client_print(0, print_chat, "*** MATCH STARTED! First to %d kills! ***", g_killLimit)
    write_state()
}

public end_match_by_time() {
    new winner = 0, max_kills = -1
    new loser = 0, second_kills = -1

    for (new i = 1; i <= 32; i++) {
        if (!is_user_connected(i)) continue
        if (g_kills[i] > max_kills) {
            second_kills = max_kills
            loser = winner
            max_kills = g_kills[i]
            winner = i
        } else if (g_kills[i] > second_kills) {
            second_kills = g_kills[i]
            loser = i
        }
    }

    new is_draw = (winner > 0 && loser > 0 && max_kills == second_kills)

    if (winner > 0 && !is_draw) {
        new name[32]
        get_user_name(winner, name, charsmax(name))
        server_print("[H2K] === MATCH RESULT === Winner: %s with %d kills (time up) ===", name, max_kills)
        client_print(0, print_chat, "*** TIME UP! %s WINS! ***", name)
        append_match_end_event(winner, loser, "timelimit")
    } else {
        server_print("[H2K] === MATCH RESULT === Draw ===")
        client_print(0, print_chat, "*** DRAW! ***")
        append_match_end_event(0, 0, "draw")
    }

    end_match()
}

public end_match() {
    g_state = STATE_ENDED
    write_state()
    set_task(10.0, "reset_match")
}

public reset_match() {
    g_state = STATE_WAITING
    for (new i = 1; i <= 32; i++) {
        g_kills[i] = 0
        g_token[i][0] = 0
    }
    g_matchId[0] = 0
    server_print("[H2K] Match reset")
    write_state()

    if (get_playersnum() >= 2) {
        start_countdown()
    }
}

// ==================== EVENT LOG ====================

// Append a match_end event to h2k_events.jsonl. Sidecar tails this file and POSTs to H2K.
// Payload intentionally opaque at plugin level — tokens are passed through, sidecar verifies HMAC.
append_match_end_event(winner_slot, loser_slot, const reason[]) {
    new file = fopen(EVENTS_FILE, "a")
    if (!file) {
        server_print("[H2K] Failed to open events file")
        return
    }

    new winner_token[192], loser_token[192]
    new winner_kills = 0, loser_kills = 0
    new winner_name[32], loser_name[32]

    if (winner_slot > 0) {
        copy(winner_token, charsmax(winner_token), g_token[winner_slot])
        winner_kills = g_kills[winner_slot]
        get_user_name(winner_slot, winner_name, charsmax(winner_name))
    }
    if (loser_slot > 0) {
        copy(loser_token, charsmax(loser_token), g_token[loser_slot])
        loser_kills = g_kills[loser_slot]
        get_user_name(loser_slot, loser_name, charsmax(loser_name))
    }

    // One JSON object per line (JSONL). Caret ^" escapes a literal " in Pawn strings.
    fprintf(file, "{^"type^":^"match_end^",^"time^":%d,^"matchId^":^"%s^",^"reason^":^"%s^",^"winner^":{^"slot^":%d,^"name^":^"%s^",^"kills^":%d,^"token^":^"%s^"},^"loser^":{^"slot^":%d,^"name^":^"%s^",^"kills^":%d,^"token^":^"%s^"}}^n",
        get_systime(), g_matchId, reason,
        winner_slot, winner_name, winner_kills, winner_token,
        loser_slot, loser_name, loser_kills, loser_token)

    fclose(file)
    server_print("[H2K] match_end event appended: matchId=%s reason=%s winner=%d loser=%d",
        g_matchId, reason, winner_slot, loser_slot)
}
