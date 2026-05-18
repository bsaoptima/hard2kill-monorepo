#include <amxmodx>
#include <amxmisc>
#include <cstrike>
#include <fun>
#include <hamsandwich>

// Hard2Kill Team Deathmatch — minimal TDM plugin for Phase 0.
//
// v0.2 — removed auto-team-assign. It was racing the VGUI team-select flow
//        and causing a WASM "remainder by zero" trap when the engine tried
//        to place the player before team/model state was fully registered.
//        Native CS 1.6 team + model menus run normally; plugin only enforces
//        cvars, gives loadout on spawn, and instant-respawns on death.
//
// Scope: native team/model select → custom loadout on spawn → instant respawn.
// NO auto team join, NO tokens, NO events.jsonl, NO match-end.
//
// Wagering (pot-per-kill) re-lands in Phase 5+ via a sibling plugin OR by
// reintroducing token reading + kill_event JSONL writes here. Keep this file
// small and boring — it's the baseline everything else layers on top of.

#define PLUGIN  "H2K TDM"
#define VERSION "0.3"
#define AUTHOR  "Hard2Kill"

public plugin_init() {
    register_plugin(PLUGIN, VERSION, AUTHOR)

    // Pre-hook Ham_Killed so we schedule respawn BEFORE the engine runs
    // its round-end-by-team-wipe check. Without this, a 1v1 kill wipes
    // the victim's team → round restarts → feels round-based, not TDM.
    RegisterHam(Ham_Killed, "player", "ham_killed_pre", 0)
    RegisterHam(Ham_Spawn,  "player", "event_spawn",    1)

    // Enforce TDM cvars from the plugin so server.cfg drift can't break gameplay.
    set_cvar_num("mp_buytime", 0)           // buying disabled
    set_cvar_num("mp_freezetime", 0)        // no freeze at round start
    set_cvar_num("mp_forcerespawn", 1)
    set_cvar_num("mp_respawndelay", 0)
    set_cvar_num("mp_timelimit", 30)        // 30-minute map timer
    set_cvar_num("mp_friendlyfire", 0)
    set_cvar_num("mp_autoteambalance", 1)   // CS built-in balances
    set_cvar_num("mp_limitteams", 2)
    set_cvar_num("mp_startmoney", 16000)
    set_cvar_num("mp_c4timer", 0)           // no bomb
    set_cvar_num("mp_roundtime", 9)         // max round time = effectively continuous

    server_print("[H2K TDM] v%s loaded", VERSION)
}

// ==================== SPAWN → LOADOUT ====================

public event_spawn(id) {
    if (!is_user_alive(id)) return
    // Small delay so team/model are fully settled before we strip/give.
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

// ==================== DEATH → INSTANT RESPAWN ====================

// Ham_Killed pre fires before engine's kill bookkeeping. Scheduling a short
// respawn task here means the respawn will hit the next-frame task queue
// before the round-end check.
public ham_killed_pre(victim, attacker, shouldgib) {
    if (victim <= 0) return HAM_IGNORED
    set_task(0.5, "respawn_player", victim)
    return HAM_IGNORED
}

public respawn_player(id) {
    if (!is_user_connected(id) || is_user_alive(id)) return
    ExecuteHamB(Ham_CS_RoundRespawn, id)
}
