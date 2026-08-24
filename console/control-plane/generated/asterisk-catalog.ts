// GENERATED FILE - do not edit by hand.
// Produced by console/scripts/generate-asterisk-catalog.mjs.

export const ASTERISK_CATALOG = {
  "schemaVersion": 1,
  "generatedFrom": "Asterisk source checkout",
  "generatedAt": "1970-01-01T00:00:00.000Z",
  "sourceFamilies": [
    "apps",
    "bridges",
    "cdr",
    "cel",
    "channels",
    "codecs",
    "formats",
    "funcs",
    "pbx",
    "res",
    "main"
  ],
  "counts": {
    "modules": 383,
    "resources": 119,
    "total": 502
  },
  "modules": [
    {
      "id": "asterisk.apps.app_adsiprog",
      "kind": "module",
      "family": "apps",
      "name": "app_adsiprog.so",
      "source": "apps/app_adsiprog.c",
      "description": "Asterisk ADSI Programming Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "adsi.conf",
        "adsi.conf.sample"
      ],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_adsiprog.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_adsiprog.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_agent_pool",
      "kind": "module",
      "family": "apps",
      "name": "app_agent_pool.so",
      "source": "apps/app_agent_pool.c",
      "description": "Call center agent pool applications",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "agents.conf",
        "agents.conf.sample",
        "features.conf.sample",
        "queues.conf"
      ],
      "sourceSurfaces": [
        "cli",
        "ami",
        "application",
        "function",
        "bridge"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_agent_pool.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_agent_pool.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_alarmreceiver",
      "kind": "module",
      "family": "apps",
      "name": "app_alarmreceiver.so",
      "source": "apps/app_alarmreceiver.c",
      "description": "Alarm Receiver for Asterisk",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "alarmreceiver.conf",
        "alarmreceiver.conf.sample"
      ],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_alarmreceiver.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_alarmreceiver.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_amd",
      "kind": "module",
      "family": "apps",
      "name": "app_amd.so",
      "source": "apps/app_amd.c",
      "description": "Answering Machine Detection Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "amd.conf",
        "amd.conf.sample"
      ],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_amd.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_amd.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_attended_transfer",
      "kind": "module",
      "family": "apps",
      "name": "app_attended_transfer.so",
      "source": "apps/app_attended_transfer.c",
      "description": "Attended transfer to the given extension",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_attended_transfer.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_attended_transfer.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_audiosocket",
      "kind": "module",
      "family": "apps",
      "name": "app_audiosocket.so",
      "source": "apps/app_audiosocket.c",
      "description": "AudioSocket Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "audiosocket.conf"
      ],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_audiosocket.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_audiosocket.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_authenticate",
      "kind": "module",
      "family": "apps",
      "name": "app_authenticate.so",
      "source": "apps/app_authenticate.c",
      "description": "Authentication Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_authenticate.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_authenticate.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_blind_transfer",
      "kind": "module",
      "family": "apps",
      "name": "app_blind_transfer.so",
      "source": "apps/app_blind_transfer.c",
      "description": "Blind transfer channel to the given destination",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_blind_transfer.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_blind_transfer.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_bridgeaddchan",
      "kind": "module",
      "family": "apps",
      "name": "app_bridgeaddchan.so",
      "source": "apps/app_bridgeaddchan.c",
      "description": "Bridge Add Channel Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_bridgeaddchan.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_bridgeaddchan.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_bridgewait",
      "kind": "module",
      "family": "apps",
      "name": "app_bridgewait.so",
      "source": "apps/app_bridgewait.c",
      "description": "Place the channel into a holding bridge application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application",
        "bridge"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_bridgewait.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_bridgewait.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_broadcast",
      "kind": "module",
      "family": "apps",
      "name": "app_broadcast.so",
      "source": "apps/app_broadcast.c",
      "description": "Channel Audio Broadcasting",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_broadcast.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_broadcast.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_cdr",
      "kind": "module",
      "family": "apps",
      "name": "app_cdr.so",
      "source": "apps/app_cdr.c",
      "description": "Tell Asterisk to not maintain a CDR for the current call",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_cdr.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_cdr.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_celgenuserevent",
      "kind": "module",
      "family": "apps",
      "name": "app_celgenuserevent.so",
      "source": "apps/app_celgenuserevent.c",
      "description": "Generate an User-Defined CEL event",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_celgenuserevent.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_celgenuserevent.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_chanisavail",
      "kind": "module",
      "family": "apps",
      "name": "app_chanisavail.so",
      "source": "apps/app_chanisavail.c",
      "description": "Check channel availability",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_chanisavail.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_chanisavail.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_channelredirect",
      "kind": "module",
      "family": "apps",
      "name": "app_channelredirect.so",
      "source": "apps/app_channelredirect.c",
      "description": "Redirects a given channel to a dialplan target",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_channelredirect.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_channelredirect.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_chanspy",
      "kind": "module",
      "family": "apps",
      "name": "app_chanspy.so",
      "source": "apps/app_chanspy.c",
      "description": "Listen to the audio of an active channel",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_chanspy.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_chanspy.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_confbridge",
      "kind": "module",
      "family": "apps",
      "name": "app_confbridge.so",
      "source": "apps/app_confbridge.c",
      "description": "Conference Bridge Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "args.conf",
        "confbridge.conf",
        "confbridge.conf.sample"
      ],
      "sourceSurfaces": [
        "cli",
        "ami",
        "agi",
        "application",
        "function",
        "channel",
        "bridge"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_confbridge.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_confbridge.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_controlplayback",
      "kind": "module",
      "family": "apps",
      "name": "app_controlplayback.so",
      "source": "apps/app_controlplayback.c",
      "description": "Control Playback Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ami",
        "agi",
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_controlplayback.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_controlplayback.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_db",
      "kind": "module",
      "family": "apps",
      "name": "app_db.so",
      "source": "apps/app_db.c",
      "description": "Database Access Functions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_db.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_db.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_dial",
      "kind": "module",
      "family": "apps",
      "name": "app_dial.so",
      "source": "apps/app_dial.c",
      "description": "Dialing Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "features.conf",
        "indications.conf",
        "musiconhold.conf"
      ],
      "sourceSurfaces": [
        "agi",
        "application",
        "rtp"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_dial.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_dial.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_dictate",
      "kind": "module",
      "family": "apps",
      "name": "app_dictate.so",
      "source": "apps/app_dictate.c",
      "description": "Virtual Dictation Machine",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_dictate.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_dictate.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_directed_pickup",
      "kind": "module",
      "family": "apps",
      "name": "app_directed_pickup.so",
      "source": "apps/app_directed_pickup.c",
      "description": "Directed Call Pickup Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_directed_pickup.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_directed_pickup.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_directory",
      "kind": "module",
      "family": "apps",
      "name": "app_directory.so",
      "source": "apps/app_directory.c",
      "description": "Extension Directory",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "voicemail.conf"
      ],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_directory.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_directory.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_disa",
      "kind": "module",
      "family": "apps",
      "name": "app_disa.so",
      "source": "apps/app_disa.c",
      "description": "DISA (Direct Inward System Access) Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "extensions.conf"
      ],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_disa.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_disa.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_dtmfstore",
      "kind": "module",
      "family": "apps",
      "name": "app_dtmfstore.so",
      "source": "apps/app_dtmfstore.c",
      "description": "Technology independent async DTMF storage",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_dtmfstore.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_dtmfstore.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_dumpchan",
      "kind": "module",
      "family": "apps",
      "name": "app_dumpchan.so",
      "source": "apps/app_dumpchan.c",
      "description": "Dump Info About The Calling Channel",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_dumpchan.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_dumpchan.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_echo",
      "kind": "module",
      "family": "apps",
      "name": "app_echo.so",
      "source": "apps/app_echo.c",
      "description": "Simple Echo Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_echo.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_echo.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_exec",
      "kind": "module",
      "family": "apps",
      "name": "app_exec.so",
      "source": "apps/app_exec.c",
      "description": "Executes dialplan applications",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_exec.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_exec.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_externalivr",
      "kind": "module",
      "family": "apps",
      "name": "app_externalivr.so",
      "source": "apps/app_externalivr.c",
      "description": "External IVR Interface Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_externalivr.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_externalivr.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_festival",
      "kind": "module",
      "family": "apps",
      "name": "app_festival.so",
      "source": "apps/app_festival.c",
      "description": "Simple Festival Interface",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "festival.conf",
        "festival.conf.sample"
      ],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_festival.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_festival.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_flash",
      "kind": "module",
      "family": "apps",
      "name": "app_flash.so",
      "source": "apps/app_flash.c",
      "description": "Flash channel application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_flash.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_flash.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_followme",
      "kind": "module",
      "family": "apps",
      "name": "app_followme.so",
      "source": "apps/app_followme.c",
      "description": "Find-Me/Follow-Me Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "followme.conf",
        "followme.conf.sample"
      ],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_followme.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_followme.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_forkcdr",
      "kind": "module",
      "family": "apps",
      "name": "app_forkcdr.so",
      "source": "apps/app_forkcdr.c",
      "description": "Fork The CDR into 2 separate entities",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_forkcdr.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_forkcdr.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_getcpeid",
      "kind": "module",
      "family": "apps",
      "name": "app_getcpeid.so",
      "source": "apps/app_getcpeid.c",
      "description": "Get ADSI CPE ID",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "dahdi.conf"
      ],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_getcpeid.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_getcpeid.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_if",
      "kind": "module",
      "family": "apps",
      "name": "app_if.so",
      "source": "apps/app_if.c",
      "description": "If Branch and Conditional Execution",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_if.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_if.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_ivrdemo",
      "kind": "module",
      "family": "apps",
      "name": "app_ivrdemo.so",
      "source": "apps/app_ivrdemo.c",
      "description": "IVR Demo Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_ivrdemo.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_ivrdemo.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_jack",
      "kind": "module",
      "family": "apps",
      "name": "app_jack.so",
      "source": "apps/app_jack.c",
      "description": "JACK Interface",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_jack.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_jack.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_meetme",
      "kind": "module",
      "family": "apps",
      "name": "app_meetme.so",
      "source": "apps/app_meetme.c",
      "description": "MeetMe conference bridge",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "args.conf",
        "dahdic.conf",
        "meetme.conf",
        "meetme.conf.sample"
      ],
      "sourceSurfaces": [
        "cli",
        "ami",
        "agi",
        "application",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_meetme.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_meetme.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_mf",
      "kind": "module",
      "family": "apps",
      "name": "app_mf.so",
      "source": "apps/app_mf.c",
      "description": "MF Sender and Receiver Applications",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ami",
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_mf.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_mf.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_milliwatt",
      "kind": "module",
      "family": "apps",
      "name": "app_milliwatt.so",
      "source": "apps/app_milliwatt.c",
      "description": "Digital Milliwatt (mu-law) Test Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_milliwatt.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_milliwatt.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_minivm",
      "kind": "module",
      "family": "apps",
      "name": "app_minivm.so",
      "source": "apps/app_minivm.c",
      "description": "Mini VoiceMail (A minimal Voicemail e-mail System)",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "asterisk.conf",
        "extensions_minivm.conf.sample",
        "minivm.conf",
        "minivm.conf.sample",
        "voicemail.conf"
      ],
      "sourceSurfaces": [
        "cli",
        "application",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_minivm.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_minivm.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_mixmonitor",
      "kind": "module",
      "family": "apps",
      "name": "app_mixmonitor.so",
      "source": "apps/app_mixmonitor.c",
      "description": "Mixed Audio Monitoring Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "asterisk.conf"
      ],
      "sourceSurfaces": [
        "cli",
        "ami",
        "application",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_mixmonitor.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_mixmonitor.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_morsecode",
      "kind": "module",
      "family": "apps",
      "name": "app_morsecode.so",
      "source": "apps/app_morsecode.c",
      "description": "Morse code",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_morsecode.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_morsecode.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_mp3",
      "kind": "module",
      "family": "apps",
      "name": "app_mp3.so",
      "source": "apps/app_mp3.c",
      "description": "Silly MP3 Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_mp3.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_mp3.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_originate",
      "kind": "module",
      "family": "apps",
      "name": "app_originate.so",
      "source": "apps/app_originate.c",
      "description": "Originate call",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_originate.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_originate.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_page",
      "kind": "module",
      "family": "apps",
      "name": "app_page.so",
      "source": "apps/app_page.c",
      "description": "Page Multiple Phones",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_page.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_page.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_playback",
      "kind": "module",
      "family": "apps",
      "name": "app_playback.so",
      "source": "apps/app_playback.c",
      "description": "Sound File Playback Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "say.conf",
        "say.conf.sample"
      ],
      "sourceSurfaces": [
        "cli",
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_playback.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_playback.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_playtones",
      "kind": "module",
      "family": "apps",
      "name": "app_playtones.so",
      "source": "apps/app_playtones.c",
      "description": "Playtones Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "indications.conf"
      ],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_playtones.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_playtones.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_privacy",
      "kind": "module",
      "family": "apps",
      "name": "app_privacy.so",
      "source": "apps/app_privacy.c",
      "description": "Require phone number to be entered, if no CallerID sent",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_privacy.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_privacy.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_queue",
      "kind": "module",
      "family": "apps",
      "name": "app_queue.so",
      "source": "apps/app_queue.c",
      "description": "True Call Queueing",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "extconfig.conf",
        "features.conf",
        "queuerules.conf",
        "queues.conf",
        "queues.conf.sample"
      ],
      "sourceSurfaces": [
        "cli",
        "ami",
        "agi",
        "application",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_queue.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_queue.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_read",
      "kind": "module",
      "family": "apps",
      "name": "app_read.so",
      "source": "apps/app_read.c",
      "description": "Read Variable Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "indications.conf"
      ],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_read.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_read.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_readexten",
      "kind": "module",
      "family": "apps",
      "name": "app_readexten.so",
      "source": "apps/app_readexten.c",
      "description": "Read and evaluate extension validity",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "indications.conf"
      ],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_readexten.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_readexten.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_record",
      "kind": "module",
      "family": "apps",
      "name": "app_record.so",
      "source": "apps/app_record.c",
      "description": "Trivial Record Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_record.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_record.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_reload",
      "kind": "module",
      "family": "apps",
      "name": "app_reload.so",
      "source": "apps/app_reload.c",
      "description": "Reload module(s)",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_reload.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_reload.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_saycounted",
      "kind": "module",
      "family": "apps",
      "name": "app_saycounted.so",
      "source": "apps/app_saycounted.c",
      "description": "Decline words according to channel language",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_saycounted.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_saycounted.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_sayunixtime",
      "kind": "module",
      "family": "apps",
      "name": "app_sayunixtime.so",
      "source": "apps/app_sayunixtime.c",
      "description": "Say time",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "voicemail.conf"
      ],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_sayunixtime.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_sayunixtime.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_senddtmf",
      "kind": "module",
      "family": "apps",
      "name": "app_senddtmf.so",
      "source": "apps/app_senddtmf.c",
      "description": "Send DTMF digits Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ami",
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_senddtmf.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_senddtmf.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_sendtext",
      "kind": "module",
      "family": "apps",
      "name": "app_sendtext.so",
      "source": "apps/app_sendtext.c",
      "description": "Send and Receive Text Applications",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_sendtext.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_sendtext.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_sf",
      "kind": "module",
      "family": "apps",
      "name": "app_sf.so",
      "source": "apps/app_sf.c",
      "description": "SF Sender and Receiver Applications",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_sf.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_sf.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_signal",
      "kind": "module",
      "family": "apps",
      "name": "app_signal.so",
      "source": "apps/app_signal.c",
      "description": "Channel Signaling Applications",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_signal.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_signal.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_skel",
      "kind": "module",
      "family": "apps",
      "name": "app_skel.so",
      "source": "apps/app_skel.c",
      "description": "Skeleton (sample) Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "app_skel.conf",
        "app_skel.conf.sample"
      ],
      "sourceSurfaces": [
        "cli",
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_skel.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_skel.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_sla",
      "kind": "module",
      "family": "apps",
      "name": "app_sla.so",
      "source": "apps/app_sla.c",
      "description": "Shared Line Appearances",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "sla.conf",
        "sla.conf.sample"
      ],
      "sourceSurfaces": [
        "cli",
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_sla.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_sla.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_sms",
      "kind": "module",
      "family": "apps",
      "name": "app_sms.so",
      "source": "apps/app_sms.c",
      "description": "SMS/PSTN handler",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_sms.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_sms.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_softhangup",
      "kind": "module",
      "family": "apps",
      "name": "app_softhangup.so",
      "source": "apps/app_softhangup.c",
      "description": "Hangs up the requested channel",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_softhangup.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_softhangup.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_speech_utils",
      "kind": "module",
      "family": "apps",
      "name": "app_speech_utils.so",
      "source": "apps/app_speech_utils.c",
      "description": "Dialplan Speech Applications",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_speech_utils.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_speech_utils.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_stack",
      "kind": "module",
      "family": "apps",
      "name": "app_stack.so",
      "source": "apps/app_stack.c",
      "description": "Dialplan subroutines (Gosub, Return, etc)",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "agi",
        "application",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_stack.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_stack.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_stasis",
      "kind": "module",
      "family": "apps",
      "name": "app_stasis.so",
      "source": "apps/app_stasis.c",
      "description": "Stasis dialplan application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ari",
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_stasis.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_stasis.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_stasis_broadcast",
      "kind": "module",
      "family": "apps",
      "name": "app_stasis_broadcast.so",
      "source": "apps/app_stasis_broadcast.c",
      "description": "Stasis application broadcast",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_stasis_broadcast.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_stasis_broadcast.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_statsd",
      "kind": "module",
      "family": "apps",
      "name": "app_statsd.so",
      "source": "apps/app_statsd.c",
      "description": "StatsD Dialplan Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "statsd.conf"
      ],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_statsd.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_statsd.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_stream_echo",
      "kind": "module",
      "family": "apps",
      "name": "app_stream_echo.so",
      "source": "apps/app_stream_echo.c",
      "description": "Stream Echo Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_stream_echo.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_stream_echo.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_system",
      "kind": "module",
      "family": "apps",
      "name": "app_system.so",
      "source": "apps/app_system.c",
      "description": "Generic System() application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_system.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_system.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_talkdetect",
      "kind": "module",
      "family": "apps",
      "name": "app_talkdetect.so",
      "source": "apps/app_talkdetect.c",
      "description": "Playback with Talk Detection",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_talkdetect.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_talkdetect.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_test",
      "kind": "module",
      "family": "apps",
      "name": "app_test.so",
      "source": "apps/app_test.c",
      "description": "Interface Test Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_test.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_test.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_transfer",
      "kind": "module",
      "family": "apps",
      "name": "app_transfer.so",
      "source": "apps/app_transfer.c",
      "description": "Transfers a caller to another extension",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_transfer.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_transfer.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_userevent",
      "kind": "module",
      "family": "apps",
      "name": "app_userevent.so",
      "source": "apps/app_userevent.c",
      "description": "Custom User Event Application",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_userevent.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_userevent.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_verbose",
      "kind": "module",
      "family": "apps",
      "name": "app_verbose.so",
      "source": "apps/app_verbose.c",
      "description": "Send verbose output",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_verbose.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_verbose.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_voicemail",
      "kind": "module",
      "family": "apps",
      "name": "app_voicemail.so",
      "source": "apps/app_voicemail.c",
      "description": "Loadable apps module from apps/app_voicemail.c.",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "secret.conf",
        "voicemail.conf",
        "voicemail.conf.sample"
      ],
      "sourceSurfaces": [
        "cli",
        "ami",
        "agi",
        "application",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_voicemail.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_voicemail.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_waitforcond",
      "kind": "module",
      "family": "apps",
      "name": "app_waitforcond.so",
      "source": "apps/app_waitforcond.c",
      "description": "Wait until condition is true",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_waitforcond.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_waitforcond.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_waitforring",
      "kind": "module",
      "family": "apps",
      "name": "app_waitforring.so",
      "source": "apps/app_waitforring.c",
      "description": "Waits until first ring after time",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_waitforring.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_waitforring.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_waitforsilence",
      "kind": "module",
      "family": "apps",
      "name": "app_waitforsilence.so",
      "source": "apps/app_waitforsilence.c",
      "description": "Wait For Silence/Noise",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "dsp.conf"
      ],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_waitforsilence.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_waitforsilence.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_waituntil",
      "kind": "module",
      "family": "apps",
      "name": "app_waituntil.so",
      "source": "apps/app_waituntil.c",
      "description": "Wait until specified time",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_waituntil.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_waituntil.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_while",
      "kind": "module",
      "family": "apps",
      "name": "app_while.so",
      "source": "apps/app_while.c",
      "description": "While Loops and Conditional Execution",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_while.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_while.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.apps.app_zapateller",
      "kind": "module",
      "family": "apps",
      "name": "app_zapateller.so",
      "source": "apps/app_zapateller.c",
      "description": "Block Telemarketers with Special Information Tone",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for apps/app_zapateller.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for apps/app_zapateller.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.bridges.bridge_builtin_features",
      "kind": "module",
      "family": "bridges",
      "name": "bridge_builtin_features.so",
      "source": "bridges/bridge_builtin_features.c",
      "description": "Built in bridging features",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for bridges/bridge_builtin_features.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for bridges/bridge_builtin_features.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.bridges.bridge_builtin_interval_features",
      "kind": "module",
      "family": "bridges",
      "name": "bridge_builtin_interval_features.so",
      "source": "bridges/bridge_builtin_interval_features.c",
      "description": "Built in bridging interval features",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for bridges/bridge_builtin_interval_features.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for bridges/bridge_builtin_interval_features.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.bridges.bridge_holding",
      "kind": "module",
      "family": "bridges",
      "name": "bridge_holding.so",
      "source": "bridges/bridge_holding.c",
      "description": "Holding bridge module",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "bridge"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for bridges/bridge_holding.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for bridges/bridge_holding.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.bridges.bridge_native_rtp",
      "kind": "module",
      "family": "bridges",
      "name": "bridge_native_rtp.so",
      "source": "bridges/bridge_native_rtp.c",
      "description": "Native RTP bridging module",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "bridge",
        "rtp"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for bridges/bridge_native_rtp.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for bridges/bridge_native_rtp.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.bridges.bridge_simple",
      "kind": "module",
      "family": "bridges",
      "name": "bridge_simple.so",
      "source": "bridges/bridge_simple.c",
      "description": "Simple two channel bridging module",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "bridge"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for bridges/bridge_simple.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for bridges/bridge_simple.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.bridges.bridge_softmix",
      "kind": "module",
      "family": "bridges",
      "name": "bridge_softmix.so",
      "source": "bridges/bridge_softmix.c",
      "description": "Multi-party software based channel mixing",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "bridge",
        "rtp"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for bridges/bridge_softmix.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for bridges/bridge_softmix.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.cdr.cdr_adaptive_odbc",
      "kind": "module",
      "family": "cdr",
      "name": "cdr_adaptive_odbc.so",
      "source": "cdr/cdr_adaptive_odbc.c",
      "description": "Adaptive ODBC CDR backend",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cdr_adaptive_odbc.conf",
        "cdr_adaptive_odbc.conf.sample",
        "res_odbc.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for cdr/cdr_adaptive_odbc.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for cdr/cdr_adaptive_odbc.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.cdr.cdr_beanstalkd",
      "kind": "module",
      "family": "cdr",
      "name": "cdr_beanstalkd.so",
      "source": "cdr/cdr_beanstalkd.c",
      "description": "Asterisk Beanstalkd CDR Backend",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cdr_beanstalkd.conf",
        "cdr_beanstalkd.conf.sample"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for cdr/cdr_beanstalkd.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for cdr/cdr_beanstalkd.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.cdr.cdr_csv",
      "kind": "module",
      "family": "cdr",
      "name": "cdr_csv.so",
      "source": "cdr/cdr_csv.c",
      "description": "Comma Separated Values CDR Backend",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cdr.conf",
        "dahdi.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for cdr/cdr_csv.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for cdr/cdr_csv.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.cdr.cdr_custom",
      "kind": "module",
      "family": "cdr",
      "name": "cdr_custom.so",
      "source": "cdr/cdr_custom.c",
      "description": "Customizable Comma Separated Values CDR Backend",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cdr_custom.conf",
        "cdr_custom.conf.sample"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for cdr/cdr_custom.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for cdr/cdr_custom.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.cdr.cdr_manager",
      "kind": "module",
      "family": "cdr",
      "name": "cdr_manager.so",
      "source": "cdr/cdr_manager.c",
      "description": "Asterisk Manager Interface CDR Backend",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cdr.conf",
        "cdr_manager.conf",
        "cdr_manager.conf.sample"
      ],
      "sourceSurfaces": [
        "ami"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for cdr/cdr_manager.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for cdr/cdr_manager.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.cdr.cdr_odbc",
      "kind": "module",
      "family": "cdr",
      "name": "cdr_odbc.so",
      "source": "cdr/cdr_odbc.c",
      "description": "ODBC CDR Backend",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cdr_odbc.conf",
        "cdr_odbc.conf.sample"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for cdr/cdr_odbc.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for cdr/cdr_odbc.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.cdr.cdr_pgsql",
      "kind": "module",
      "family": "cdr",
      "name": "cdr_pgsql.so",
      "source": "cdr/cdr_pgsql.c",
      "description": "PostgreSQL CDR Backend",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cdr_pgsql.conf",
        "cdr_pgsql.conf.sample"
      ],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for cdr/cdr_pgsql.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for cdr/cdr_pgsql.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.cdr.cdr_radius",
      "kind": "module",
      "family": "cdr",
      "name": "cdr_radius.so",
      "source": "cdr/cdr_radius.c",
      "description": "RADIUS CDR Backend",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cdr.conf",
        "radiusclient.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for cdr/cdr_radius.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for cdr/cdr_radius.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.cdr.cdr_sqlite3_custom",
      "kind": "module",
      "family": "cdr",
      "name": "cdr_sqlite3_custom.so",
      "source": "cdr/cdr_sqlite3_custom.c",
      "description": "SQLite3 Custom CDR Module",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cdr_sqlite3_custom.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for cdr/cdr_sqlite3_custom.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for cdr/cdr_sqlite3_custom.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.cdr.cdr_tds",
      "kind": "module",
      "family": "cdr",
      "name": "cdr_tds.so",
      "source": "cdr/cdr_tds.c",
      "description": "FreeTDS CDR Backend",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cdr_tds.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for cdr/cdr_tds.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for cdr/cdr_tds.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.cel.cel_beanstalkd",
      "kind": "module",
      "family": "cel",
      "name": "cel_beanstalkd.so",
      "source": "cel/cel_beanstalkd.c",
      "description": "Beanstalkd CEL Backend",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cel.conf",
        "cel.conf.sample",
        "cel_beanstalkd.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for cel/cel_beanstalkd.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for cel/cel_beanstalkd.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.cel.cel_custom",
      "kind": "module",
      "family": "cel",
      "name": "cel_custom.so",
      "source": "cel/cel_custom.c",
      "description": "Customizable Comma Separated Values CEL Backend",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cel_custom.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for cel/cel_custom.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for cel/cel_custom.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.cel.cel_manager",
      "kind": "module",
      "family": "cel",
      "name": "cel_manager.so",
      "source": "cel/cel_manager.c",
      "description": "Asterisk Manager Interface CEL Backend",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cel.conf"
      ],
      "sourceSurfaces": [
        "ami"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for cel/cel_manager.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for cel/cel_manager.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.cel.cel_odbc",
      "kind": "module",
      "family": "cel",
      "name": "cel_odbc.so",
      "source": "cel/cel_odbc.c",
      "description": "ODBC CEL backend",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cel_odbc.conf",
        "res_odbc.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for cel/cel_odbc.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for cel/cel_odbc.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.cel.cel_pgsql",
      "kind": "module",
      "family": "cel",
      "name": "cel_pgsql.so",
      "source": "cel/cel_pgsql.c",
      "description": "PostgreSQL CEL Backend",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cel_pgsql.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for cel/cel_pgsql.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for cel/cel_pgsql.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.cel.cel_radius",
      "kind": "module",
      "family": "cel",
      "name": "cel_radius.so",
      "source": "cel/cel_radius.c",
      "description": "RADIUS CEL Backend",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cel.conf",
        "radiusclient.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for cel/cel_radius.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for cel/cel_radius.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.cel.cel_sqlite3_custom",
      "kind": "module",
      "family": "cel",
      "name": "cel_sqlite3_custom.so",
      "source": "cel/cel_sqlite3_custom.c",
      "description": "SQLite3 Custom CEL Module",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cel_sqlite3_custom.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for cel/cel_sqlite3_custom.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for cel/cel_sqlite3_custom.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.cel.cel_tds",
      "kind": "module",
      "family": "cel",
      "name": "cel_tds.so",
      "source": "cel/cel_tds.c",
      "description": "FreeTDS CEL Backend",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cel_tds.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for cel/cel_tds.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for cel/cel_tds.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.channels.chan_audiosocket",
      "kind": "module",
      "family": "channels",
      "name": "chan_audiosocket.so",
      "source": "channels/chan_audiosocket.c",
      "description": "AudioSocket Channel",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "channel"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for channels/chan_audiosocket.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for channels/chan_audiosocket.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.channels.chan_bridge_media",
      "kind": "module",
      "family": "channels",
      "name": "chan_bridge_media.so",
      "source": "channels/chan_bridge_media.c",
      "description": "Bridge Media Channel Driver",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "channel"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for channels/chan_bridge_media.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for channels/chan_bridge_media.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.channels.chan_console",
      "kind": "module",
      "family": "channels",
      "name": "chan_console.so",
      "source": "channels/chan_console.c",
      "description": "Console Channel Driver",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "console.conf",
        "console.conf.sample",
        "oss.conf"
      ],
      "sourceSurfaces": [
        "cli",
        "channel"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for channels/chan_console.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for channels/chan_console.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.channels.chan_dahdi",
      "kind": "module",
      "family": "channels",
      "name": "chan_dahdi.so",
      "source": "channels/chan_dahdi.c",
      "description": "Loadable channels module from channels/chan_dahdi.c.",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "c.conf",
        "chan_dahdi.conf",
        "chan_dahdi.conf.sample",
        "ci.conf",
        "curconf.conf",
        "mfcr2.conf",
        "saveconf.conf",
        "zi.conf"
      ],
      "sourceSurfaces": [
        "cli",
        "ami",
        "application",
        "function",
        "channel"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for channels/chan_dahdi.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for channels/chan_dahdi.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.channels.chan_iax2",
      "kind": "module",
      "family": "channels",
      "name": "chan_iax2.so",
      "source": "channels/chan_iax2.c",
      "description": "Inter Asterisk eXchange (Ver 2)",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "iax.conf",
        "iax.conf.sample"
      ],
      "sourceSurfaces": [
        "cli",
        "ami",
        "application",
        "function",
        "channel"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for channels/chan_iax2.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for channels/chan_iax2.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.channels.chan_motif",
      "kind": "module",
      "family": "channels",
      "name": "chan_motif.so",
      "source": "channels/chan_motif.c",
      "description": "Motif Jingle Channel Driver",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "motif.conf",
        "motif.conf.sample"
      ],
      "sourceSurfaces": [
        "channel",
        "rtp"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for channels/chan_motif.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for channels/chan_motif.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.channels.chan_pjsip",
      "kind": "module",
      "family": "channels",
      "name": "chan_pjsip.so",
      "source": "channels/chan_pjsip.c",
      "description": "PJSIP Channel Driver",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "indications.conf"
      ],
      "sourceSurfaces": [
        "ami",
        "application",
        "function",
        "channel",
        "rtp"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for channels/chan_pjsip.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for channels/chan_pjsip.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.channels.chan_rtp",
      "kind": "module",
      "family": "channels",
      "name": "chan_rtp.so",
      "source": "channels/chan_rtp.c",
      "description": "RTP Media Channel",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "channel",
        "rtp"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for channels/chan_rtp.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for channels/chan_rtp.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.channels.chan_unistim",
      "kind": "module",
      "family": "channels",
      "name": "chan_unistim.so",
      "source": "channels/chan_unistim.c",
      "description": "UNISTIM Protocol (USTM)",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "indications.conf",
        "unistim.conf",
        "unistim.conf.sample"
      ],
      "sourceSurfaces": [
        "cli",
        "channel",
        "rtp"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for channels/chan_unistim.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for channels/chan_unistim.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.channels.chan_websocket",
      "kind": "module",
      "family": "channels",
      "name": "chan_websocket.so",
      "source": "channels/chan_websocket.c",
      "description": "Websocket Media Channel",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "chan_websocket.conf"
      ],
      "sourceSurfaces": [
        "channel",
        "http"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for channels/chan_websocket.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for channels/chan_websocket.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.codecs.codec_a_mu",
      "kind": "module",
      "family": "codecs",
      "name": "codec_a_mu.so",
      "source": "codecs/codec_a_mu.c",
      "description": "A-law and Mulaw direct Coder/Decoder",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for codecs/codec_a_mu.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for codecs/codec_a_mu.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.codecs.codec_adpcm",
      "kind": "module",
      "family": "codecs",
      "name": "codec_adpcm.so",
      "source": "codecs/codec_adpcm.c",
      "description": "Adaptive Differential PCM Coder/Decoder",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for codecs/codec_adpcm.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for codecs/codec_adpcm.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.codecs.codec_alaw",
      "kind": "module",
      "family": "codecs",
      "name": "codec_alaw.so",
      "source": "codecs/codec_alaw.c",
      "description": "A-law Coder/Decoder",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for codecs/codec_alaw.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for codecs/codec_alaw.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.codecs.codec_codec2",
      "kind": "module",
      "family": "codecs",
      "name": "codec_codec2.so",
      "source": "codecs/codec_codec2.c",
      "description": "Codec 2 Coder/Decoder",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for codecs/codec_codec2.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for codecs/codec_codec2.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.codecs.codec_dahdi",
      "kind": "module",
      "family": "codecs",
      "name": "codec_dahdi.so",
      "source": "codecs/codec_dahdi.c",
      "description": "Generic DAHDI Transcoder Codec Translator",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for codecs/codec_dahdi.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for codecs/codec_dahdi.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.codecs.codec_g722",
      "kind": "module",
      "family": "codecs",
      "name": "codec_g722.so",
      "source": "codecs/codec_g722.c",
      "description": "ITU G.722-64kbps G722 Transcoder",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for codecs/codec_g722.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for codecs/codec_g722.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.codecs.codec_g726",
      "kind": "module",
      "family": "codecs",
      "name": "codec_g726.so",
      "source": "codecs/codec_g726.c",
      "description": "ITU G.726-32kbps G726 Transcoder",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for codecs/codec_g726.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for codecs/codec_g726.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.codecs.codec_gsm",
      "kind": "module",
      "family": "codecs",
      "name": "codec_gsm.so",
      "source": "codecs/codec_gsm.c",
      "description": "GSM Coder/Decoder",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for codecs/codec_gsm.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for codecs/codec_gsm.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.codecs.codec_ilbc",
      "kind": "module",
      "family": "codecs",
      "name": "codec_ilbc.so",
      "source": "codecs/codec_ilbc.c",
      "description": "iLBC Coder/Decoder",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for codecs/codec_ilbc.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for codecs/codec_ilbc.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.codecs.codec_lpc10",
      "kind": "module",
      "family": "codecs",
      "name": "codec_lpc10.so",
      "source": "codecs/codec_lpc10.c",
      "description": "LPC10 2.4kbps Coder/Decoder",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for codecs/codec_lpc10.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for codecs/codec_lpc10.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.codecs.codec_resample",
      "kind": "module",
      "family": "codecs",
      "name": "codec_resample.so",
      "source": "codecs/codec_resample.c",
      "description": "SLIN Resampling Codec",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for codecs/codec_resample.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for codecs/codec_resample.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.codecs.codec_speex",
      "kind": "module",
      "family": "codecs",
      "name": "codec_speex.so",
      "source": "codecs/codec_speex.c",
      "description": "Speex Coder/Decoder",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "codecs.conf"
      ],
      "sourceSurfaces": [
        "rtp"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for codecs/codec_speex.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for codecs/codec_speex.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.codecs.codec_ulaw",
      "kind": "module",
      "family": "codecs",
      "name": "codec_ulaw.so",
      "source": "codecs/codec_ulaw.c",
      "description": "mu-Law Coder/Decoder",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for codecs/codec_ulaw.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for codecs/codec_ulaw.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.formats.format_g719",
      "kind": "module",
      "family": "formats",
      "name": "format_g719.so",
      "source": "formats/format_g719.c",
      "description": "ITU G.719",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "format"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for formats/format_g719.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for formats/format_g719.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.formats.format_g723",
      "kind": "module",
      "family": "formats",
      "name": "format_g723.so",
      "source": "formats/format_g723.c",
      "description": "G.723.1 Simple Timestamp File Format",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "format"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for formats/format_g723.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for formats/format_g723.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.formats.format_g726",
      "kind": "module",
      "family": "formats",
      "name": "format_g726.so",
      "source": "formats/format_g726.c",
      "description": "Raw G.726 (16/24/32/40kbps) data",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "format"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for formats/format_g726.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for formats/format_g726.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.formats.format_g729",
      "kind": "module",
      "family": "formats",
      "name": "format_g729.so",
      "source": "formats/format_g729.c",
      "description": "Raw G.729 data",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "format"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for formats/format_g729.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for formats/format_g729.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.formats.format_gsm",
      "kind": "module",
      "family": "formats",
      "name": "format_gsm.so",
      "source": "formats/format_gsm.c",
      "description": "Raw GSM data",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "format"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for formats/format_gsm.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for formats/format_gsm.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.formats.format_h263",
      "kind": "module",
      "family": "formats",
      "name": "format_h263.so",
      "source": "formats/format_h263.c",
      "description": "Raw H.263 data",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "format"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for formats/format_h263.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for formats/format_h263.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.formats.format_h264",
      "kind": "module",
      "family": "formats",
      "name": "format_h264.so",
      "source": "formats/format_h264.c",
      "description": "Raw H.264 data",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "format"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for formats/format_h264.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for formats/format_h264.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.formats.format_ilbc",
      "kind": "module",
      "family": "formats",
      "name": "format_ilbc.so",
      "source": "formats/format_ilbc.c",
      "description": "Raw iLBC data",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "format"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for formats/format_ilbc.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for formats/format_ilbc.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.formats.format_ogg_speex",
      "kind": "module",
      "family": "formats",
      "name": "format_ogg_speex.so",
      "source": "formats/format_ogg_speex.c",
      "description": "OGG/Speex audio",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "format"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for formats/format_ogg_speex.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for formats/format_ogg_speex.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.formats.format_ogg_vorbis",
      "kind": "module",
      "family": "formats",
      "name": "format_ogg_vorbis.so",
      "source": "formats/format_ogg_vorbis.c",
      "description": "OGG/Vorbis audio",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "format"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for formats/format_ogg_vorbis.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for formats/format_ogg_vorbis.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.formats.format_pcm",
      "kind": "module",
      "family": "formats",
      "name": "format_pcm.so",
      "source": "formats/format_pcm.c",
      "description": "Raw/Sun uLaw/ALaw 8KHz (PCM,PCMA,AU), G.722 16Khz",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "agi",
        "format"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for formats/format_pcm.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for formats/format_pcm.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.formats.format_siren14",
      "kind": "module",
      "family": "formats",
      "name": "format_siren14.so",
      "source": "formats/format_siren14.c",
      "description": "ITU G.722.1 Annex C (Siren14, licensed from Polycom)",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "format"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for formats/format_siren14.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for formats/format_siren14.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.formats.format_siren7",
      "kind": "module",
      "family": "formats",
      "name": "format_siren7.so",
      "source": "formats/format_siren7.c",
      "description": "ITU G.722.1 (Siren7, licensed from Polycom)",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "format"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for formats/format_siren7.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for formats/format_siren7.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.formats.format_sln",
      "kind": "module",
      "family": "formats",
      "name": "format_sln.so",
      "source": "formats/format_sln.c",
      "description": "Raw Signed Linear Audio support (SLN) 8khz-192khz",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "format"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for formats/format_sln.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for formats/format_sln.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.formats.format_vox",
      "kind": "module",
      "family": "formats",
      "name": "format_vox.so",
      "source": "formats/format_vox.c",
      "description": "Dialogic VOX (ADPCM) File Format",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "format"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for formats/format_vox.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for formats/format_vox.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.formats.format_wav",
      "kind": "module",
      "family": "formats",
      "name": "format_wav.so",
      "source": "formats/format_wav.c",
      "description": "Microsoft WAV/WAV16 format (8kHz/16kHz Signed Linear)",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "format"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for formats/format_wav.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for formats/format_wav.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.formats.format_wav_gsm",
      "kind": "module",
      "family": "formats",
      "name": "format_wav_gsm.so",
      "source": "formats/format_wav_gsm.c",
      "description": "Microsoft WAV format (Proprietary GSM)",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "format"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for formats/format_wav_gsm.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for formats/format_wav_gsm.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_aes",
      "kind": "module",
      "family": "funcs",
      "name": "func_aes.so",
      "source": "funcs/func_aes.c",
      "description": "AES dialplan functions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_aes.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_aes.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_base64",
      "kind": "module",
      "family": "funcs",
      "name": "func_base64.so",
      "source": "funcs/func_base64.c",
      "description": "base64 encode/decode dialplan functions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_base64.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_base64.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_blacklist",
      "kind": "module",
      "family": "funcs",
      "name": "func_blacklist.so",
      "source": "funcs/func_blacklist.c",
      "description": "Look up Caller*ID name/number from blacklist database",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_blacklist.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_blacklist.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_callcompletion",
      "kind": "module",
      "family": "funcs",
      "name": "func_callcompletion.so",
      "source": "funcs/func_callcompletion.c",
      "description": "Call Control Configuration Function",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "ccss.conf.sample"
      ],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_callcompletion.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_callcompletion.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_callerid",
      "kind": "module",
      "family": "funcs",
      "name": "func_callerid.so",
      "source": "funcs/func_callerid.c",
      "description": "Party ID related dialplan functions (Caller-ID, Connected-line, Redirecting)",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_callerid.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_callerid.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_cdr",
      "kind": "module",
      "family": "funcs",
      "name": "func_cdr.so",
      "source": "funcs/func_cdr.c",
      "description": "Call Detail Record (CDR) dialplan functions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_cdr.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_cdr.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_channel",
      "kind": "module",
      "family": "funcs",
      "name": "func_channel.so",
      "source": "funcs/func_channel.c",
      "description": "Channel information dialplan functions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "indications.conf",
        "musiconhold.conf"
      ],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_channel.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_channel.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_config",
      "kind": "module",
      "family": "funcs",
      "name": "func_config.so",
      "source": "funcs/func_config.c",
      "description": "Asterisk configuration file variable access",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_config.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_config.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_curl",
      "kind": "module",
      "family": "funcs",
      "name": "func_curl.so",
      "source": "funcs/func_curl.c",
      "description": "Load external URL",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "asterisk.conf"
      ],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_curl.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_curl.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_cut",
      "kind": "module",
      "family": "funcs",
      "name": "func_cut.so",
      "source": "funcs/func_cut.c",
      "description": "Cut out information from a string",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_cut.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_cut.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_db",
      "kind": "module",
      "family": "funcs",
      "name": "func_db.so",
      "source": "funcs/func_db.c",
      "description": "Database (astdb) related dialplan functions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "asterisk.conf"
      ],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_db.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_db.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_devstate",
      "kind": "module",
      "family": "funcs",
      "name": "func_devstate.so",
      "source": "funcs/func_devstate.c",
      "description": "Gets or sets a device state in the dialplan",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "cli",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_devstate.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_devstate.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_dialgroup",
      "kind": "module",
      "family": "funcs",
      "name": "func_dialgroup.so",
      "source": "funcs/func_dialgroup.c",
      "description": "Dialgroup dialplan function",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_dialgroup.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_dialgroup.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_dialplan",
      "kind": "module",
      "family": "funcs",
      "name": "func_dialplan.so",
      "source": "funcs/func_dialplan.c",
      "description": "Dialplan Context/Extension/Priority Checking Functions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_dialplan.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_dialplan.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_enum",
      "kind": "module",
      "family": "funcs",
      "name": "func_enum.so",
      "source": "funcs/func_enum.c",
      "description": "ENUM related dialplan functions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_enum.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_enum.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_env",
      "kind": "module",
      "family": "funcs",
      "name": "func_env.so",
      "source": "funcs/func_env.c",
      "description": "Environment/filesystem dialplan functions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "asterisk.conf",
        "extensions.conf"
      ],
      "sourceSurfaces": [
        "agi",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_env.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_env.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_evalexten",
      "kind": "module",
      "family": "funcs",
      "name": "func_evalexten.so",
      "source": "funcs/func_evalexten.c",
      "description": "Extension evaluation function",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_evalexten.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_evalexten.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_export",
      "kind": "module",
      "family": "funcs",
      "name": "func_export.so",
      "source": "funcs/func_export.c",
      "description": "Set variables and functions on other channels",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_export.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_export.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_extstate",
      "kind": "module",
      "family": "funcs",
      "name": "func_extstate.so",
      "source": "funcs/func_extstate.c",
      "description": "Gets an extension's state in the dialplan",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_extstate.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_extstate.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_frame_drop",
      "kind": "module",
      "family": "funcs",
      "name": "func_frame_drop.so",
      "source": "funcs/func_frame_drop.c",
      "description": "Function to drop frames on a channel.",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_frame_drop.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_frame_drop.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_frame_trace",
      "kind": "module",
      "family": "funcs",
      "name": "func_frame_trace.so",
      "source": "funcs/func_frame_trace.c",
      "description": "Frame Trace for internal ast_frame debugging.",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "cli",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_frame_trace.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_frame_trace.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_global",
      "kind": "module",
      "family": "funcs",
      "name": "func_global.so",
      "source": "funcs/func_global.c",
      "description": "Variable dialplan functions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_global.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_global.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_groupcount",
      "kind": "module",
      "family": "funcs",
      "name": "func_groupcount.so",
      "source": "funcs/func_groupcount.c",
      "description": "Channel group dialplan functions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_groupcount.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_groupcount.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_hangupcause",
      "kind": "module",
      "family": "funcs",
      "name": "func_hangupcause.so",
      "source": "funcs/func_hangupcause.c",
      "description": "HANGUPCAUSE related functions and applications",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_hangupcause.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_hangupcause.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_holdintercept",
      "kind": "module",
      "family": "funcs",
      "name": "func_holdintercept.so",
      "source": "funcs/func_holdintercept.c",
      "description": "Hold interception dialplan function",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_holdintercept.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_holdintercept.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_iconv",
      "kind": "module",
      "family": "funcs",
      "name": "func_iconv.so",
      "source": "funcs/func_iconv.c",
      "description": "Charset conversions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_iconv.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_iconv.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_jitterbuffer",
      "kind": "module",
      "family": "funcs",
      "name": "func_jitterbuffer.so",
      "source": "funcs/func_jitterbuffer.c",
      "description": "Jitter buffer for read side of channel.",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_jitterbuffer.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_jitterbuffer.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_json",
      "kind": "module",
      "family": "funcs",
      "name": "func_json.so",
      "source": "funcs/func_json.c",
      "description": "JSON decoding function",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_json.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_json.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_lock",
      "kind": "module",
      "family": "funcs",
      "name": "func_lock.so",
      "source": "funcs/func_lock.c",
      "description": "Dialplan mutexes",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "asterisk.conf"
      ],
      "sourceSurfaces": [
        "cli",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_lock.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_lock.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_logic",
      "kind": "module",
      "family": "funcs",
      "name": "func_logic.so",
      "source": "funcs/func_logic.c",
      "description": "Logical dialplan functions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_logic.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_logic.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_math",
      "kind": "module",
      "family": "funcs",
      "name": "func_math.so",
      "source": "funcs/func_math.c",
      "description": "Mathematical dialplan function",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_math.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_math.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_md5",
      "kind": "module",
      "family": "funcs",
      "name": "func_md5.so",
      "source": "funcs/func_md5.c",
      "description": "MD5 digest dialplan functions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_md5.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_md5.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_module",
      "kind": "module",
      "family": "funcs",
      "name": "func_module.so",
      "source": "funcs/func_module.c",
      "description": "Checks if Asterisk module is loaded in memory",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_module.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_module.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_odbc",
      "kind": "module",
      "family": "funcs",
      "name": "func_odbc.so",
      "source": "funcs/func_odbc.c",
      "description": "ODBC lookups",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "func_odbc.conf",
        "res_odbc.conf"
      ],
      "sourceSurfaces": [
        "cli",
        "application",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_odbc.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_odbc.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_periodic_hook",
      "kind": "module",
      "family": "funcs",
      "name": "func_periodic_hook.so",
      "source": "funcs/func_periodic_hook.c",
      "description": "Periodic dialplan hooks.",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_periodic_hook.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_periodic_hook.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_pitchshift",
      "kind": "module",
      "family": "funcs",
      "name": "func_pitchshift.so",
      "source": "funcs/func_pitchshift.c",
      "description": "Audio Effects Dialplan Functions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_pitchshift.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_pitchshift.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_pjsip_aor",
      "kind": "module",
      "family": "funcs",
      "name": "func_pjsip_aor.so",
      "source": "funcs/func_pjsip_aor.c",
      "description": "Get information about a PJSIP AOR",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "pjsip.conf"
      ],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_pjsip_aor.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_pjsip_aor.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_pjsip_contact",
      "kind": "module",
      "family": "funcs",
      "name": "func_pjsip_contact.so",
      "source": "funcs/func_pjsip_contact.c",
      "description": "Get information about a PJSIP contact",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "pjsip.conf"
      ],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_pjsip_contact.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_pjsip_contact.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_pjsip_endpoint",
      "kind": "module",
      "family": "funcs",
      "name": "func_pjsip_endpoint.so",
      "source": "funcs/func_pjsip_endpoint.c",
      "description": "Get information about a PJSIP endpoint",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "pjsip.conf"
      ],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_pjsip_endpoint.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_pjsip_endpoint.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_presencestate",
      "kind": "module",
      "family": "funcs",
      "name": "func_presencestate.so",
      "source": "funcs/func_presencestate.c",
      "description": "Gets or sets a presence state in the dialplan",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "cli",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_presencestate.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_presencestate.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_rand",
      "kind": "module",
      "family": "funcs",
      "name": "func_rand.so",
      "source": "funcs/func_rand.c",
      "description": "Random number dialplan function",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_rand.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_rand.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_realtime",
      "kind": "module",
      "family": "funcs",
      "name": "func_realtime.so",
      "source": "funcs/func_realtime.c",
      "description": "Read/Write/Store/Destroy values from a RealTime repository",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "asterisk.conf"
      ],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_realtime.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_realtime.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_sayfiles",
      "kind": "module",
      "family": "funcs",
      "name": "func_sayfiles.so",
      "source": "funcs/func_sayfiles.c",
      "description": "Say application files",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_sayfiles.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_sayfiles.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_scramble",
      "kind": "module",
      "family": "funcs",
      "name": "func_scramble.so",
      "source": "funcs/func_scramble.c",
      "description": "Frequency inverting voice scrambler",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_scramble.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_scramble.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_sha1",
      "kind": "module",
      "family": "funcs",
      "name": "func_sha1.so",
      "source": "funcs/func_sha1.c",
      "description": "SHA-1 computation dialplan function",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_sha1.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_sha1.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_shell",
      "kind": "module",
      "family": "funcs",
      "name": "func_shell.so",
      "source": "funcs/func_shell.c",
      "description": "Collects the output generated by a command executed by the system shell",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "asterisk.conf"
      ],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_shell.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_shell.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_sorcery",
      "kind": "module",
      "family": "funcs",
      "name": "func_sorcery.so",
      "source": "funcs/func_sorcery.c",
      "description": "Get a field from a sorcery object",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_sorcery.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_sorcery.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_speex",
      "kind": "module",
      "family": "funcs",
      "name": "func_speex.so",
      "source": "funcs/func_speex.c",
      "description": "Noise reduction and Automatic Gain Control (AGC)",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_speex.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_speex.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_sprintf",
      "kind": "module",
      "family": "funcs",
      "name": "func_sprintf.so",
      "source": "funcs/func_sprintf.c",
      "description": "SPRINTF dialplan function",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_sprintf.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_sprintf.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_srv",
      "kind": "module",
      "family": "funcs",
      "name": "func_srv.so",
      "source": "funcs/func_srv.c",
      "description": "SRV related dialplan functions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_srv.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_srv.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_strings",
      "kind": "module",
      "family": "funcs",
      "name": "func_strings.so",
      "source": "funcs/func_strings.c",
      "description": "String handling dialplan functions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_strings.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_strings.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_sysinfo",
      "kind": "module",
      "family": "funcs",
      "name": "func_sysinfo.so",
      "source": "funcs/func_sysinfo.c",
      "description": "System information related functions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_sysinfo.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_sysinfo.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_talkdetect",
      "kind": "module",
      "family": "funcs",
      "name": "func_talkdetect.so",
      "source": "funcs/func_talkdetect.c",
      "description": "Talk detection dialplan function",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "dsp.conf"
      ],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_talkdetect.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_talkdetect.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_timeout",
      "kind": "module",
      "family": "funcs",
      "name": "func_timeout.so",
      "source": "funcs/func_timeout.c",
      "description": "Channel timeout dialplan functions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_timeout.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_timeout.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_uri",
      "kind": "module",
      "family": "funcs",
      "name": "func_uri.so",
      "source": "funcs/func_uri.c",
      "description": "URI encode/decode dialplan functions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_uri.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_uri.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_uuid",
      "kind": "module",
      "family": "funcs",
      "name": "func_uuid.so",
      "source": "funcs/func_uuid.c",
      "description": "UUID generation dialplan function",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_uuid.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_uuid.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_version",
      "kind": "module",
      "family": "funcs",
      "name": "func_version.so",
      "source": "funcs/func_version.c",
      "description": "Get Asterisk Version/Build Info",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_version.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_version.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_vmcount",
      "kind": "module",
      "family": "funcs",
      "name": "func_vmcount.so",
      "source": "funcs/func_vmcount.c",
      "description": "Indicator for whether a voice mailbox has messages in a given folder.",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_vmcount.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_vmcount.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.funcs.func_volume",
      "kind": "module",
      "family": "funcs",
      "name": "func_volume.so",
      "source": "funcs/func_volume.c",
      "description": "Technology independent volume control",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for funcs/func_volume.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for funcs/func_volume.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.main.ccss",
      "kind": "module",
      "family": "main",
      "name": "ccss.so",
      "source": "main/ccss.c",
      "description": "Call Completion Supplementary Services",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "ccss.conf",
        "ccss.conf.sample"
      ],
      "sourceSurfaces": [
        "cli",
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for main/ccss.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for main/ccss.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.main.cdr",
      "kind": "module",
      "family": "main",
      "name": "cdr.so",
      "source": "main/cdr.c",
      "description": "CDR Engine",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cdr.conf",
        "cdr.conf.sample"
      ],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for main/cdr.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for main/cdr.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.main.cel",
      "kind": "module",
      "family": "main",
      "name": "cel.so",
      "source": "main/cel.c",
      "description": "CEL Engine",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cel.conf",
        "cel.conf.sample"
      ],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for main/cel.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for main/cel.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.main.config",
      "kind": "module",
      "family": "main",
      "name": "config.so",
      "source": "main/config.c",
      "description": "Configuration",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "asterisk.conf",
        "extconfig.conf",
        "filename.conf",
        "logger.conf"
      ],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for main/config.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for main/config.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.main.dnsmgr",
      "kind": "module",
      "family": "main",
      "name": "dnsmgr.so",
      "source": "main/dnsmgr.c",
      "description": "DNS Manager",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "dnsmgr.conf",
        "dnsmgr.conf.sample"
      ],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for main/dnsmgr.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for main/dnsmgr.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.main.dsp",
      "kind": "module",
      "family": "main",
      "name": "dsp.so",
      "source": "main/dsp.c",
      "description": "DSP",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "dsp.conf",
        "dsp.conf.sample"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for main/dsp.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for main/dsp.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.main.enum",
      "kind": "module",
      "family": "main",
      "name": "enum.so",
      "source": "main/enum.c",
      "description": "ENUM Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "enum.conf",
        "enum.conf.sample"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for main/enum.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for main/enum.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.main.features",
      "kind": "module",
      "family": "main",
      "name": "features.so",
      "source": "main/features.c",
      "description": "Call Features",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "features.conf",
        "features.conf.sample"
      ],
      "sourceSurfaces": [
        "ami",
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for main/features.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for main/features.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.main.http",
      "kind": "module",
      "family": "main",
      "name": "http.so",
      "source": "main/http.c",
      "description": "Built-in HTTP Server",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "http.conf",
        "http.conf.sample"
      ],
      "sourceSurfaces": [
        "cli",
        "http",
        "tls"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for main/http.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for main/http.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.main.indications",
      "kind": "module",
      "family": "main",
      "name": "indications.so",
      "source": "main/indications.c",
      "description": "Indication Tone Handling",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "indications.conf"
      ],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for main/indications.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for main/indications.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.main.logger",
      "kind": "module",
      "family": "main",
      "name": "logger.so",
      "source": "main/logger.c",
      "description": "Logger",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "logger.conf",
        "logger.conf.sample"
      ],
      "sourceSurfaces": [
        "cli",
        "ami",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for main/logger.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for main/logger.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.main.manager",
      "kind": "module",
      "family": "main",
      "name": "manager.so",
      "source": "main/manager.c",
      "description": "Asterisk Manager Interface",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "manager.conf",
        "manager.conf.sample"
      ],
      "sourceSurfaces": [
        "cli",
        "ami",
        "agi",
        "function",
        "http",
        "tls"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for main/manager.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for main/manager.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.main.named_acl",
      "kind": "module",
      "family": "main",
      "name": "named_acl.so",
      "source": "main/named_acl.c",
      "description": "Named ACL system",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "acl.conf",
        "modules.conf"
      ],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for main/named_acl.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for main/named_acl.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.main.plc",
      "kind": "module",
      "family": "main",
      "name": "plc.so",
      "source": "main/plc.c",
      "description": "PLC",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "codecs.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for main/plc.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for main/plc.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.main.sounds",
      "kind": "module",
      "family": "main",
      "name": "sounds.so",
      "source": "main/sounds.c",
      "description": "Sounds Index",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for main/sounds.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for main/sounds.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.main.udptl",
      "kind": "module",
      "family": "main",
      "name": "udptl.so",
      "source": "main/udptl.c",
      "description": "UDPTL",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "udptl.conf",
        "udptl.conf.sample"
      ],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for main/udptl.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for main/udptl.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.pbx.pbx_ael",
      "kind": "module",
      "family": "pbx",
      "name": "pbx_ael.so",
      "source": "pbx/pbx_ael.c",
      "description": "Asterisk Extension Language Compiler",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "extensions.conf"
      ],
      "sourceSurfaces": [
        "cli",
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for pbx/pbx_ael.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for pbx/pbx_ael.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.pbx.pbx_config",
      "kind": "module",
      "family": "pbx",
      "name": "pbx_config.so",
      "source": "pbx/pbx_config.c",
      "description": "Text Extension Configuration",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "extensions.conf"
      ],
      "sourceSurfaces": [
        "cli",
        "ami"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for pbx/pbx_config.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for pbx/pbx_config.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.pbx.pbx_dundi",
      "kind": "module",
      "family": "pbx",
      "name": "pbx_dundi.so",
      "source": "pbx/pbx_dundi.c",
      "description": "Distributed Universal Number Discovery (DUNDi)",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "dundi.conf",
        "dundi.conf.sample"
      ],
      "sourceSurfaces": [
        "cli",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for pbx/pbx_dundi.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for pbx/pbx_dundi.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.pbx.pbx_loopback",
      "kind": "module",
      "family": "pbx",
      "name": "pbx_loopback.so",
      "source": "pbx/pbx_loopback.c",
      "description": "Loopback Switch",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for pbx/pbx_loopback.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for pbx/pbx_loopback.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.pbx.pbx_lua",
      "kind": "module",
      "family": "pbx",
      "name": "pbx_lua.so",
      "source": "pbx/pbx_lua.c",
      "description": "Lua PBX Switch",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for pbx/pbx_lua.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for pbx/pbx_lua.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.pbx.pbx_realtime",
      "kind": "module",
      "family": "pbx",
      "name": "pbx_realtime.so",
      "source": "pbx/pbx_realtime.c",
      "description": "Realtime Switch",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for pbx/pbx_realtime.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for pbx/pbx_realtime.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.pbx.pbx_spool",
      "kind": "module",
      "family": "pbx",
      "name": "pbx_spool.so",
      "source": "pbx/pbx_spool.c",
      "description": "Outgoing Spool Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for pbx/pbx_spool.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for pbx/pbx_spool.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_adsi",
      "kind": "module",
      "family": "res",
      "name": "res_adsi.so",
      "source": "res/res_adsi.c",
      "description": "ADSI Resource",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "adsi.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_adsi.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_adsi.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_aeap",
      "kind": "module",
      "family": "res",
      "name": "res_aeap.so",
      "source": "res/res_aeap.c",
      "description": "Asterisk External Application Protocol Module for Asterisk",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "aeap.conf"
      ],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_aeap.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_aeap.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_ael_share",
      "kind": "module",
      "family": "res",
      "name": "res_ael_share.so",
      "source": "res/res_ael_share.c",
      "description": "share-able code for AEL",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_ael_share.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_ael_share.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_agi",
      "kind": "module",
      "family": "res",
      "name": "res_agi.so",
      "source": "res/res_agi.c",
      "description": "Asterisk Gateway Interface (AGI)",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "asterisk.conf",
        "voicemail.conf"
      ],
      "sourceSurfaces": [
        "cli",
        "ami",
        "agi",
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_agi.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_agi.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_ari",
      "kind": "module",
      "family": "res",
      "name": "res_ari.so",
      "source": "res/res_ari.c",
      "description": "Asterisk RESTful Interface",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ari",
        "http"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_ari.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_ari.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_ari_applications",
      "kind": "module",
      "family": "res",
      "name": "res_ari_applications.so",
      "source": "res/res_ari_applications.c",
      "description": "RESTful API module - Stasis application resources",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ari"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_ari_applications.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_ari_applications.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_ari_asterisk",
      "kind": "module",
      "family": "res",
      "name": "res_ari_asterisk.so",
      "source": "res/res_ari_asterisk.c",
      "description": "RESTful API module - Asterisk resources",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "args.conf"
      ],
      "sourceSurfaces": [
        "ari"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_ari_asterisk.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_ari_asterisk.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_ari_bridges",
      "kind": "module",
      "family": "res",
      "name": "res_ari_bridges.so",
      "source": "res/res_ari_bridges.c",
      "description": "RESTful API module - Bridge resources",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ari"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_ari_bridges.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_ari_bridges.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_ari_channels",
      "kind": "module",
      "family": "res",
      "name": "res_ari_channels.so",
      "source": "res/res_ari_channels.c",
      "description": "RESTful API module - Channel resources",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ari"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_ari_channels.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_ari_channels.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_ari_device_states",
      "kind": "module",
      "family": "res",
      "name": "res_ari_device_states.so",
      "source": "res/res_ari_device_states.c",
      "description": "RESTful API module - Device state resources",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ari"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_ari_device_states.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_ari_device_states.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_ari_endpoints",
      "kind": "module",
      "family": "res",
      "name": "res_ari_endpoints.so",
      "source": "res/res_ari_endpoints.c",
      "description": "RESTful API module - Endpoint resources",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ari"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_ari_endpoints.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_ari_endpoints.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_ari_events",
      "kind": "module",
      "family": "res",
      "name": "res_ari_events.so",
      "source": "res/res_ari_events.c",
      "description": "RESTful API module - WebSocket resource",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ari"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_ari_events.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_ari_events.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_ari_mailboxes",
      "kind": "module",
      "family": "res",
      "name": "res_ari_mailboxes.so",
      "source": "res/res_ari_mailboxes.c",
      "description": "RESTful API module - Mailboxes resources",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ari"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_ari_mailboxes.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_ari_mailboxes.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_ari_model",
      "kind": "module",
      "family": "res",
      "name": "res_ari_model.so",
      "source": "res/res_ari_model.c",
      "description": "ARI Model validators",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ari"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_ari_model.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_ari_model.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_ari_playbacks",
      "kind": "module",
      "family": "res",
      "name": "res_ari_playbacks.so",
      "source": "res/res_ari_playbacks.c",
      "description": "RESTful API module - Playback control resources",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ari"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_ari_playbacks.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_ari_playbacks.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_ari_recordings",
      "kind": "module",
      "family": "res",
      "name": "res_ari_recordings.so",
      "source": "res/res_ari_recordings.c",
      "description": "RESTful API module - Recording resources",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ari"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_ari_recordings.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_ari_recordings.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_ari_sounds",
      "kind": "module",
      "family": "res",
      "name": "res_ari_sounds.so",
      "source": "res/res_ari_sounds.c",
      "description": "RESTful API module - Sound resources",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ari"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_ari_sounds.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_ari_sounds.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_audiosocket",
      "kind": "module",
      "family": "res",
      "name": "res_audiosocket.so",
      "source": "res/res_audiosocket.c",
      "description": "AudioSocket support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_audiosocket.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_audiosocket.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_calendar",
      "kind": "module",
      "family": "res",
      "name": "res_calendar.so",
      "source": "res/res_calendar.c",
      "description": "Asterisk Calendar integration",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "calendar.conf",
        "calendar.conf.sample"
      ],
      "sourceSurfaces": [
        "cli",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_calendar.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_calendar.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_calendar_caldav",
      "kind": "module",
      "family": "res",
      "name": "res_calendar_caldav.so",
      "source": "res/res_calendar_caldav.c",
      "description": "Asterisk CalDAV Calendar Integration",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "calendar.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_calendar_caldav.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_calendar_caldav.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_calendar_ews",
      "kind": "module",
      "family": "res",
      "name": "res_calendar_ews.so",
      "source": "res/res_calendar_ews.c",
      "description": "Asterisk MS Exchange Web Service Calendar Integration",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_calendar_ews.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_calendar_ews.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_calendar_exchange",
      "kind": "module",
      "family": "res",
      "name": "res_calendar_exchange.so",
      "source": "res/res_calendar_exchange.c",
      "description": "Asterisk MS Exchange Calendar Integration",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_calendar_exchange.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_calendar_exchange.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_calendar_icalendar",
      "kind": "module",
      "family": "res",
      "name": "res_calendar_icalendar.so",
      "source": "res/res_calendar_icalendar.c",
      "description": "Asterisk iCalendar .ics file integration",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "calendar.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_calendar_icalendar.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_calendar_icalendar.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_cdrel_custom",
      "kind": "module",
      "family": "res",
      "name": "res_cdrel_custom.so",
      "source": "res/res_cdrel_custom.c",
      "description": "Combined logic for CDR/CEL Custom modules",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_cdrel_custom.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_cdrel_custom.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_chan_stats",
      "kind": "module",
      "family": "res",
      "name": "res_chan_stats.so",
      "source": "res/res_chan_stats.c",
      "description": "Example of how to use Stasis",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_chan_stats.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_chan_stats.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_clialiases",
      "kind": "module",
      "family": "res",
      "name": "res_clialiases.so",
      "source": "res/res_clialiases.c",
      "description": "CLI Aliases",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "cli_aliases.conf",
        "cli_aliases.conf.sample"
      ],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_clialiases.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_clialiases.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_cliexec",
      "kind": "module",
      "family": "res",
      "name": "res_cliexec.so",
      "source": "res/res_cliexec.c",
      "description": "Simple dialplan execution from the CLI",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_cliexec.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_cliexec.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_clioriginate",
      "kind": "module",
      "family": "res",
      "name": "res_clioriginate.so",
      "source": "res/res_clioriginate.c",
      "description": "Call origination and redirection from the CLI",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_clioriginate.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_clioriginate.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_config_curl",
      "kind": "module",
      "family": "res",
      "name": "res_config_curl.so",
      "source": "res/res_config_curl.c",
      "description": "Realtime Curl configuration",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "extensions.conf",
        "res_curl.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_config_curl.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_config_curl.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_config_ldap",
      "kind": "module",
      "family": "res",
      "name": "res_config_ldap.so",
      "source": "res/res_config_ldap.c",
      "description": "LDAP realtime interface",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "res_ldap.conf",
        "res_ldap.conf.sample"
      ],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_config_ldap.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_config_ldap.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_config_odbc",
      "kind": "module",
      "family": "res",
      "name": "res_config_odbc.so",
      "source": "res/res_config_odbc.c",
      "description": "Realtime ODBC configuration",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "res_config_odbc.conf",
        "res_odbc.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_config_odbc.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_config_odbc.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_config_pgsql",
      "kind": "module",
      "family": "res",
      "name": "res_config_pgsql.so",
      "source": "res/res_config_pgsql.c",
      "description": "PostgreSQL RealTime Configuration Driver",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "extconfig.conf",
        "res_pgsql.conf"
      ],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_config_pgsql.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_config_pgsql.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_config_sqlite3",
      "kind": "module",
      "family": "res",
      "name": "res_config_sqlite3.so",
      "source": "res/res_config_sqlite3.c",
      "description": "SQLite 3 realtime config engine",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "res_config_sqlite3.conf",
        "res_config_sqlite3.conf.sample"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_config_sqlite3.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_config_sqlite3.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_convert",
      "kind": "module",
      "family": "res",
      "name": "res_convert.so",
      "source": "res/res_convert.c",
      "description": "File format conversion CLI command",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_convert.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_convert.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_corosync",
      "kind": "module",
      "family": "res",
      "name": "res_corosync.so",
      "source": "res/res_corosync.c",
      "description": "Corosync",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "res_corosync.conf"
      ],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_corosync.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_corosync.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_crypto",
      "kind": "module",
      "family": "res",
      "name": "res_crypto.so",
      "source": "res/res_crypto.c",
      "description": "Cryptographic Digital Signatures",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_crypto.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_crypto.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_curl",
      "kind": "module",
      "family": "res",
      "name": "res_curl.so",
      "source": "res/res_curl.c",
      "description": "cURL Resource Module",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "res_curl.conf",
        "res_curl.conf.sample"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_curl.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_curl.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_endpoint_stats",
      "kind": "module",
      "family": "res",
      "name": "res_endpoint_stats.so",
      "source": "res/res_endpoint_stats.c",
      "description": "Endpoint statistics",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_endpoint_stats.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_endpoint_stats.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_fax",
      "kind": "module",
      "family": "res",
      "name": "res_fax.so",
      "source": "res/res_fax.c",
      "description": "Generic FAX Applications",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "res_fax.conf",
        "res_fax.conf.sample"
      ],
      "sourceSurfaces": [
        "cli",
        "ami",
        "application",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_fax.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_fax.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_fax_spandsp",
      "kind": "module",
      "family": "res",
      "name": "res_fax_spandsp.so",
      "source": "res/res_fax_spandsp.c",
      "description": "Spandsp G.711 and T.38 FAX Technologies",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_fax_spandsp.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_fax_spandsp.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_format_attr_celt",
      "kind": "module",
      "family": "res",
      "name": "res_format_attr_celt.so",
      "source": "res/res_format_attr_celt.c",
      "description": "CELT Format Attribute Module",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_format_attr_celt.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_format_attr_celt.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_format_attr_g729",
      "kind": "module",
      "family": "res",
      "name": "res_format_attr_g729.so",
      "source": "res/res_format_attr_g729.c",
      "description": "G.729 Format Attribute Module",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_format_attr_g729.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_format_attr_g729.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_format_attr_h263",
      "kind": "module",
      "family": "res",
      "name": "res_format_attr_h263.so",
      "source": "res/res_format_attr_h263.c",
      "description": "H.263 Format Attribute Module",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_format_attr_h263.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_format_attr_h263.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_format_attr_h264",
      "kind": "module",
      "family": "res",
      "name": "res_format_attr_h264.so",
      "source": "res/res_format_attr_h264.c",
      "description": "H.264 Format Attribute Module",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_format_attr_h264.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_format_attr_h264.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_format_attr_ilbc",
      "kind": "module",
      "family": "res",
      "name": "res_format_attr_ilbc.so",
      "source": "res/res_format_attr_ilbc.c",
      "description": "iLBC Format Attribute Module",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_format_attr_ilbc.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_format_attr_ilbc.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_format_attr_opus",
      "kind": "module",
      "family": "res",
      "name": "res_format_attr_opus.so",
      "source": "res/res_format_attr_opus.c",
      "description": "Opus Format Attribute Module",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_format_attr_opus.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_format_attr_opus.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_format_attr_silk",
      "kind": "module",
      "family": "res",
      "name": "res_format_attr_silk.so",
      "source": "res/res_format_attr_silk.c",
      "description": "SILK Format Attribute Module",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_format_attr_silk.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_format_attr_silk.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_format_attr_siren14",
      "kind": "module",
      "family": "res",
      "name": "res_format_attr_siren14.so",
      "source": "res/res_format_attr_siren14.c",
      "description": "Siren14 Format Attribute Module",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_format_attr_siren14.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_format_attr_siren14.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_format_attr_siren7",
      "kind": "module",
      "family": "res",
      "name": "res_format_attr_siren7.so",
      "source": "res/res_format_attr_siren7.c",
      "description": "Siren7 Format Attribute Module",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_format_attr_siren7.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_format_attr_siren7.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_format_attr_vp8",
      "kind": "module",
      "family": "res",
      "name": "res_format_attr_vp8.so",
      "source": "res/res_format_attr_vp8.c",
      "description": "VP8 Format Attribute Module",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_format_attr_vp8.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_format_attr_vp8.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_geolocation",
      "kind": "module",
      "family": "res",
      "name": "res_geolocation.so",
      "source": "res/res_geolocation.c",
      "description": "res_geolocation Module for Asterisk",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_geolocation.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_geolocation.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_hep",
      "kind": "module",
      "family": "res",
      "name": "res_hep.so",
      "source": "res/res_hep.c",
      "description": "HEPv3 API",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "hep.conf",
        "hep.conf.sample"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_hep.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_hep.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_hep_pjsip",
      "kind": "module",
      "family": "res",
      "name": "res_hep_pjsip.so",
      "source": "res/res_hep_pjsip.c",
      "description": "PJSIP HEPv3 Logger",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_hep_pjsip.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_hep_pjsip.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_hep_rtcp",
      "kind": "module",
      "family": "res",
      "name": "res_hep_rtcp.so",
      "source": "res/res_hep_rtcp.c",
      "description": "RTCP HEPv3 Logger",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_hep_rtcp.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_hep_rtcp.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_http_media_cache",
      "kind": "module",
      "family": "res",
      "name": "res_http_media_cache.so",
      "source": "res/res_http_media_cache.c",
      "description": "HTTP Media Cache Backend",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "res_http_media_cache.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_http_media_cache.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_http_media_cache.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_http_post",
      "kind": "module",
      "family": "res",
      "name": "res_http_post.so",
      "source": "res/res_http_post.c",
      "description": "HTTP POST support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "http.conf"
      ],
      "sourceSurfaces": [
        "http"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_http_post.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_http_post.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_http_websocket",
      "kind": "module",
      "family": "res",
      "name": "res_http_websocket.so",
      "source": "res/res_http_websocket.c",
      "description": "HTTP WebSocket Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "http",
        "tls"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_http_websocket.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_http_websocket.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_limit",
      "kind": "module",
      "family": "res",
      "name": "res_limit.so",
      "source": "res/res_limit.c",
      "description": "Resource limits",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_limit.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_limit.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_manager_devicestate",
      "kind": "module",
      "family": "res",
      "name": "res_manager_devicestate.so",
      "source": "res/res_manager_devicestate.c",
      "description": "Manager Device State Topic Forwarder",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ami"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_manager_devicestate.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_manager_devicestate.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_manager_presencestate",
      "kind": "module",
      "family": "res",
      "name": "res_manager_presencestate.so",
      "source": "res/res_manager_presencestate.c",
      "description": "Manager Presence State Topic Forwarder",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ami"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_manager_presencestate.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_manager_presencestate.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_musiconhold",
      "kind": "module",
      "family": "res",
      "name": "res_musiconhold.so",
      "source": "res/res_musiconhold.c",
      "description": "Music On Hold Resource",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "musiconhold.conf",
        "musiconhold.conf.sample"
      ],
      "sourceSurfaces": [
        "cli",
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_musiconhold.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_musiconhold.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_mutestream",
      "kind": "module",
      "family": "res",
      "name": "res_mutestream.so",
      "source": "res/res_mutestream.c",
      "description": "Mute audio stream resources",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ami",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_mutestream.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_mutestream.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_mwi_devstate",
      "kind": "module",
      "family": "res",
      "name": "res_mwi_devstate.so",
      "source": "res/res_mwi_devstate.c",
      "description": "MWI Device State Subscriptions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_mwi_devstate.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_mwi_devstate.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_mwi_external",
      "kind": "module",
      "family": "res",
      "name": "res_mwi_external.so",
      "source": "res/res_mwi_external.c",
      "description": "Core external MWI resource",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "sorcery.conf"
      ],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_mwi_external.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_mwi_external.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_mwi_external_ami",
      "kind": "module",
      "family": "res",
      "name": "res_mwi_external_ami.so",
      "source": "res/res_mwi_external_ami.c",
      "description": "AMI support for external MWI",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ami"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_mwi_external_ami.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_mwi_external_ami.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_odbc",
      "kind": "module",
      "family": "res",
      "name": "res_odbc.so",
      "source": "res/res_odbc.c",
      "description": "ODBC resource",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "res_odbc.conf",
        "res_odbc.conf.sample"
      ],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_odbc.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_odbc.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_odbc_transaction",
      "kind": "module",
      "family": "res",
      "name": "res_odbc_transaction.so",
      "source": "res/res_odbc_transaction.c",
      "description": "ODBC transaction resource",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "res_odbc.conf"
      ],
      "sourceSurfaces": [
        "application",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_odbc_transaction.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_odbc_transaction.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_parking",
      "kind": "module",
      "family": "res",
      "name": "res_parking.so",
      "source": "res/res_parking.c",
      "description": "Call Parking Resource",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "res_parking.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_parking.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_parking.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_phoneprov",
      "kind": "module",
      "family": "res",
      "name": "res_phoneprov.so",
      "source": "res/res_phoneprov.c",
      "description": "HTTP Phone Provisioning",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "phoneprov.conf",
        "phoneprov.conf.sample",
        "phoneprov_users.conf"
      ],
      "sourceSurfaces": [
        "cli",
        "function",
        "http"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_phoneprov.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_phoneprov.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjproject",
      "kind": "module",
      "family": "res",
      "name": "res_pjproject.so",
      "source": "res/res_pjproject.c",
      "description": "PJPROJECT Log and Utility Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "pjproject.conf",
        "pjproject.conf.sample"
      ],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjproject.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjproject.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip.so",
      "source": "res/res_pjsip.c",
      "description": "Basic SIP resource",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_acl",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_acl.so",
      "source": "res/res_pjsip_acl.c",
      "description": "PJSIP ACL Resource",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "acl.conf",
        "pjsip.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_acl.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_acl.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_aoc",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_aoc.so",
      "source": "res/res_pjsip_aoc.c",
      "description": "PJSIP AOC Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_aoc.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_aoc.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_authenticator_digest",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_authenticator_digest.so",
      "source": "res/res_pjsip_authenticator_digest.c",
      "description": "PJSIP authentication resource",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_authenticator_digest.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_authenticator_digest.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_caller_id",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_caller_id.so",
      "source": "res/res_pjsip_caller_id.c",
      "description": "PJSIP Caller ID Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_caller_id.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_caller_id.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_config_wizard",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_config_wizard.so",
      "source": "res/res_pjsip_config_wizard.c",
      "description": "PJSIP Config Wizard",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "extensions.conf",
        "pjsip_wizard.conf",
        "pjsip_wizard.conf.sample"
      ],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_config_wizard.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_config_wizard.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_dialog_info_body_generator",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_dialog_info_body_generator.so",
      "source": "res/res_pjsip_dialog_info_body_generator.c",
      "description": "PJSIP Extension State Dialog Info+XML Provider",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_dialog_info_body_generator.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_dialog_info_body_generator.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_diversion",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_diversion.so",
      "source": "res/res_pjsip_diversion.c",
      "description": "PJSIP Add Diversion Header Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_diversion.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_diversion.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_dlg_options",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_dlg_options.so",
      "source": "res/res_pjsip_dlg_options.c",
      "description": "SIP OPTIONS in dialog handler",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_dlg_options.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_dlg_options.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_dtmf_info",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_dtmf_info.so",
      "source": "res/res_pjsip_dtmf_info.c",
      "description": "PJSIP DTMF INFO Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_dtmf_info.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_dtmf_info.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_empty_info",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_empty_info.so",
      "source": "res/res_pjsip_empty_info.c",
      "description": "PJSIP Empty INFO Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_empty_info.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_empty_info.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_endpoint_identifier_anonymous",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_endpoint_identifier_anonymous.so",
      "source": "res/res_pjsip_endpoint_identifier_anonymous.c",
      "description": "PJSIP Anonymous endpoint identifier",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_endpoint_identifier_anonymous.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_endpoint_identifier_anonymous.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_endpoint_identifier_ip",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_endpoint_identifier_ip.so",
      "source": "res/res_pjsip_endpoint_identifier_ip.c",
      "description": "PJSIP IP endpoint identifier",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "pjsip.conf"
      ],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_endpoint_identifier_ip.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_endpoint_identifier_ip.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_endpoint_identifier_user",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_endpoint_identifier_user.so",
      "source": "res/res_pjsip_endpoint_identifier_user.c",
      "description": "PJSIP username endpoint identifier",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_endpoint_identifier_user.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_endpoint_identifier_user.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_exten_state",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_exten_state.so",
      "source": "res/res_pjsip_exten_state.c",
      "description": "PJSIP Extension State Notifications",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_exten_state.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_exten_state.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_geolocation",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_geolocation.so",
      "source": "res/res_pjsip_geolocation.c",
      "description": "res_pjsip_geolocation Module for Asterisk",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_geolocation.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_geolocation.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_header_funcs",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_header_funcs.so",
      "source": "res/res_pjsip_header_funcs.c",
      "description": "PJSIP Header Functions",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_header_funcs.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_header_funcs.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_history",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_history.so",
      "source": "res/res_pjsip_history.c",
      "description": "PJSIP History",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_history.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_history.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_logger",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_logger.so",
      "source": "res/res_pjsip_logger.c",
      "description": "PJSIP Packet Logger",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_logger.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_logger.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_maintenance",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_maintenance.so",
      "source": "res/res_pjsip_maintenance.c",
      "description": "PJSIP Endpoint Maintenance Mode",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "cli",
        "ami"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_maintenance.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_maintenance.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_messaging",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_messaging.so",
      "source": "res/res_pjsip_messaging.c",
      "description": "PJSIP Messaging Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_messaging.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_messaging.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_mwi",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_mwi.so",
      "source": "res/res_pjsip_mwi.c",
      "description": "PJSIP MWI resource",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_mwi.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_mwi.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_mwi_body_generator",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_mwi_body_generator.so",
      "source": "res/res_pjsip_mwi_body_generator.c",
      "description": "PJSIP MWI resource",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_mwi_body_generator.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_mwi_body_generator.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_nat",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_nat.so",
      "source": "res/res_pjsip_nat.c",
      "description": "PJSIP NAT Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_nat.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_nat.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_notify",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_notify.so",
      "source": "res/res_pjsip_notify.c",
      "description": "CLI/AMI PJSIP NOTIFY Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "pjsip_notify.conf"
      ],
      "sourceSurfaces": [
        "cli",
        "ami",
        "application"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_notify.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_notify.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_one_touch_record_info",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_one_touch_record_info.so",
      "source": "res/res_pjsip_one_touch_record_info.c",
      "description": "PJSIP INFO One Touch Recording Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_one_touch_record_info.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_one_touch_record_info.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_outbound_authenticator_digest",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_outbound_authenticator_digest.so",
      "source": "res/res_pjsip_outbound_authenticator_digest.c",
      "description": "PJSIP authentication resource",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_outbound_authenticator_digest.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_outbound_authenticator_digest.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_outbound_publish",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_outbound_publish.so",
      "source": "res/res_pjsip_outbound_publish.c",
      "description": "PJSIP Outbound Publish Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "pjsip.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_outbound_publish.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_outbound_publish.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_outbound_registration",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_outbound_registration.so",
      "source": "res/res_pjsip_outbound_registration.c",
      "description": "PJSIP Outbound Registration Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "pjsip.conf"
      ],
      "sourceSurfaces": [
        "cli",
        "ami"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_outbound_registration.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_outbound_registration.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_path",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_path.so",
      "source": "res/res_pjsip_path.c",
      "description": "PJSIP Path Header Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_path.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_path.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_phoneprov_provider",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_phoneprov_provider.so",
      "source": "res/res_pjsip_phoneprov_provider.c",
      "description": "PJSIP Phoneprov Provider",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "pjsip.conf",
        "pjsip.conf.sample"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_phoneprov_provider.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_phoneprov_provider.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_pidf_body_generator",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_pidf_body_generator.so",
      "source": "res/res_pjsip_pidf_body_generator.c",
      "description": "PJSIP Extension State PIDF Provider",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_pidf_body_generator.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_pidf_body_generator.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_pidf_digium_body_supplement",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_pidf_digium_body_supplement.so",
      "source": "res/res_pjsip_pidf_digium_body_supplement.c",
      "description": "PJSIP PIDF Sangoma presence supplement",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_pidf_digium_body_supplement.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_pidf_digium_body_supplement.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_pidf_eyebeam_body_supplement",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_pidf_eyebeam_body_supplement.so",
      "source": "res/res_pjsip_pidf_eyebeam_body_supplement.c",
      "description": "PJSIP PIDF Eyebeam supplement",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_pidf_eyebeam_body_supplement.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_pidf_eyebeam_body_supplement.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_publish_asterisk",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_publish_asterisk.so",
      "source": "res/res_pjsip_publish_asterisk.c",
      "description": "PJSIP Asterisk Event PUBLISH Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "pjsip.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_publish_asterisk.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_publish_asterisk.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_pubsub",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_pubsub.so",
      "source": "res/res_pjsip_pubsub.c",
      "description": "PJSIP event resource",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "pjsip.conf",
        "sorcery.conf"
      ],
      "sourceSurfaces": [
        "cli",
        "ami"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_pubsub.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_pubsub.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_refer",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_refer.so",
      "source": "res/res_pjsip_refer.c",
      "description": "PJSIP Blind and Attended Transfer Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_refer.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_refer.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_registrar",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_registrar.so",
      "source": "res/res_pjsip_registrar.c",
      "description": "PJSIP Registrar Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "pjsip.conf"
      ],
      "sourceSurfaces": [
        "ami"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_registrar.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_registrar.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_rfc3326",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_rfc3326.so",
      "source": "res/res_pjsip_rfc3326.c",
      "description": "PJSIP RFC3326 Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_rfc3326.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_rfc3326.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_rfc3329",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_rfc3329.so",
      "source": "res/res_pjsip_rfc3329.c",
      "description": "PJSIP RFC3329 Support (partial)",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_rfc3329.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_rfc3329.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_sdp_rtp",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_sdp_rtp.so",
      "source": "res/res_pjsip_sdp_rtp.c",
      "description": "PJSIP SDP RTP/AVP stream handler",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "rtp"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_sdp_rtp.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_sdp_rtp.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_send_to_voicemail",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_send_to_voicemail.so",
      "source": "res/res_pjsip_send_to_voicemail.c",
      "description": "PJSIP REFER Send to Voicemail Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_send_to_voicemail.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_send_to_voicemail.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_session",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_session.so",
      "source": "res/res_pjsip_session.c",
      "description": "PJSIP Session resource",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "rtp"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_session.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_session.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_sips_contact",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_sips_contact.so",
      "source": "res/res_pjsip_sips_contact.c",
      "description": "UAC SIPS Contact support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_sips_contact.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_sips_contact.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_stir_shaken",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_stir_shaken.so",
      "source": "res/res_pjsip_stir_shaken.c",
      "description": "PJSIP STIR/SHAKEN Module for Asterisk",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "rtp"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_stir_shaken.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_stir_shaken.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_t38",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_t38.so",
      "source": "res/res_pjsip_t38.c",
      "description": "PJSIP T.38 UDPTL Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_t38.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_t38.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_transport_websocket",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_transport_websocket.so",
      "source": "res/res_pjsip_transport_websocket.c",
      "description": "PJSIP WebSocket Transport Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "http"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_transport_websocket.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_transport_websocket.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_pjsip_xpidf_body_generator",
      "kind": "module",
      "family": "res",
      "name": "res_pjsip_xpidf_body_generator.so",
      "source": "res/res_pjsip_xpidf_body_generator.c",
      "description": "PJSIP Extension State PIDF Provider",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_pjsip_xpidf_body_generator.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_pjsip_xpidf_body_generator.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_prometheus",
      "kind": "module",
      "family": "res",
      "name": "res_prometheus.so",
      "source": "res/res_prometheus.c",
      "description": "Asterisk Prometheus Module",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "http.conf",
        "prometheus.conf"
      ],
      "sourceSurfaces": [
        "http"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_prometheus.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_prometheus.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_realtime",
      "kind": "module",
      "family": "res",
      "name": "res_realtime.so",
      "source": "res/res_realtime.c",
      "description": "Realtime Data Lookup/Rewrite",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_realtime.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_realtime.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_remb_modifier",
      "kind": "module",
      "family": "res",
      "name": "res_remb_modifier.so",
      "source": "res/res_remb_modifier.c",
      "description": "REMB Modifier Module",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "cli",
        "rtp"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_remb_modifier.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_remb_modifier.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_resolver_unbound",
      "kind": "module",
      "family": "res",
      "name": "res_resolver_unbound.so",
      "source": "res/res_resolver_unbound.c",
      "description": "Unbound DNS Resolver Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "resolv.conf",
        "resolver_unbound.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_resolver_unbound.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_resolver_unbound.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_rtp_asterisk",
      "kind": "module",
      "family": "res",
      "name": "res_rtp_asterisk.so",
      "source": "res/res_rtp_asterisk.c",
      "description": "Asterisk RTP Stack",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "rtp.conf"
      ],
      "sourceSurfaces": [
        "cli",
        "rtp",
        "tls"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_rtp_asterisk.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_rtp_asterisk.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_rtp_multicast",
      "kind": "module",
      "family": "res",
      "name": "res_rtp_multicast.so",
      "source": "res/res_rtp_multicast.c",
      "description": "Multicast RTP Engine",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "rtp"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_rtp_multicast.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_rtp_multicast.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_security_log",
      "kind": "module",
      "family": "res",
      "name": "res_security_log.so",
      "source": "res/res_security_log.c",
      "description": "Security Event Logging",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_security_log.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_security_log.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_smdi",
      "kind": "module",
      "family": "res",
      "name": "res_smdi.so",
      "source": "res/res_smdi.c",
      "description": "Simplified Message Desk Interface (SMDI) Resource",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "smdi.conf",
        "smdi.conf.sample"
      ],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_smdi.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_smdi.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_snmp",
      "kind": "module",
      "family": "res",
      "name": "res_snmp.so",
      "source": "res/res_snmp.c",
      "description": "SNMP [Sub]Agent for Asterisk",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "res_snmp.conf",
        "res_snmp.conf.sample"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_snmp.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_snmp.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_sorcery_astdb",
      "kind": "module",
      "family": "res",
      "name": "res_sorcery_astdb.so",
      "source": "res/res_sorcery_astdb.c",
      "description": "Sorcery Astdb Object Wizard",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_sorcery_astdb.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_sorcery_astdb.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_sorcery_config",
      "kind": "module",
      "family": "res",
      "name": "res_sorcery_config.so",
      "source": "res/res_sorcery_config.c",
      "description": "Sorcery Configuration File Object Wizard",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_sorcery_config.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_sorcery_config.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_sorcery_memory",
      "kind": "module",
      "family": "res",
      "name": "res_sorcery_memory.so",
      "source": "res/res_sorcery_memory.c",
      "description": "Sorcery In-Memory Object Wizard",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_sorcery_memory.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_sorcery_memory.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_sorcery_memory_cache",
      "kind": "module",
      "family": "res",
      "name": "res_sorcery_memory_cache.so",
      "source": "res/res_sorcery_memory_cache.c",
      "description": "Sorcery Memory Cache Object Wizard",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "cli",
        "ami"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_sorcery_memory_cache.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_sorcery_memory_cache.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_sorcery_realtime",
      "kind": "module",
      "family": "res",
      "name": "res_sorcery_realtime.so",
      "source": "res/res_sorcery_realtime.c",
      "description": "Sorcery Realtime Object Wizard",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_sorcery_realtime.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_sorcery_realtime.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_speech",
      "kind": "module",
      "family": "res",
      "name": "res_speech.so",
      "source": "res/res_speech.c",
      "description": "Generic Speech Recognition API",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_speech.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_speech.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_speech_aeap",
      "kind": "module",
      "family": "res",
      "name": "res_speech_aeap.so",
      "source": "res/res_speech_aeap.c",
      "description": "Asterisk External Application Speech Engine",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_speech_aeap.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_speech_aeap.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_srtp",
      "kind": "module",
      "family": "res",
      "name": "res_srtp.so",
      "source": "res/res_srtp.c",
      "description": "Secure RTP (SRTP)",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "rtp.conf"
      ],
      "sourceSurfaces": [
        "rtp"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_srtp.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_srtp.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_stasis",
      "kind": "module",
      "family": "res",
      "name": "res_stasis.so",
      "source": "res/res_stasis.c",
      "description": "Stasis application support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ari",
        "bridge"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_stasis.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_stasis.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_stasis_answer",
      "kind": "module",
      "family": "res",
      "name": "res_stasis_answer.so",
      "source": "res/res_stasis_answer.c",
      "description": "Stasis application answer support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_stasis_answer.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_stasis_answer.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_stasis_broadcast",
      "kind": "module",
      "family": "res",
      "name": "res_stasis_broadcast.so",
      "source": "res/res_stasis_broadcast.c",
      "description": "Stasis application broadcast",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "ari.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_stasis_broadcast.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_stasis_broadcast.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_stasis_device_state",
      "kind": "module",
      "family": "res",
      "name": "res_stasis_device_state.so",
      "source": "res/res_stasis_device_state.c",
      "description": "Stasis application device state support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "ari"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_stasis_device_state.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_stasis_device_state.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_stasis_mailbox",
      "kind": "module",
      "family": "res",
      "name": "res_stasis_mailbox.so",
      "source": "res/res_stasis_mailbox.c",
      "description": "Stasis application mailbox support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_stasis_mailbox.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_stasis_mailbox.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_stasis_playback",
      "kind": "module",
      "family": "res",
      "name": "res_stasis_playback.so",
      "source": "res/res_stasis_playback.c",
      "description": "Stasis application playback support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_stasis_playback.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_stasis_playback.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_stasis_recording",
      "kind": "module",
      "family": "res",
      "name": "res_stasis_recording.so",
      "source": "res/res_stasis_recording.c",
      "description": "Stasis application recording support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_stasis_recording.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_stasis_recording.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_stasis_snoop",
      "kind": "module",
      "family": "res",
      "name": "res_stasis_snoop.so",
      "source": "res/res_stasis_snoop.c",
      "description": "Stasis application snoop support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_stasis_snoop.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_stasis_snoop.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_stasis_test",
      "kind": "module",
      "family": "res",
      "name": "res_stasis_test.so",
      "source": "res/res_stasis_test.c",
      "description": "Stasis test utilities",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_stasis_test.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_stasis_test.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_statsd",
      "kind": "module",
      "family": "res",
      "name": "res_statsd.so",
      "source": "res/res_statsd.c",
      "description": "StatsD client support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "statsd.conf"
      ],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_statsd.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_statsd.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_stir_shaken",
      "kind": "module",
      "family": "res",
      "name": "res_stir_shaken.so",
      "source": "res/res_stir_shaken.c",
      "description": "STIR/SHAKEN Module for Asterisk",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "stir-shaken.conf",
        "stir_shaken.conf",
        "stir_shaken.conf.sample"
      ],
      "sourceSurfaces": [
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_stir_shaken.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_stir_shaken.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_stun_monitor",
      "kind": "module",
      "family": "res",
      "name": "res_stun_monitor.so",
      "source": "res/res_stun_monitor.c",
      "description": "STUN Network Monitor",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "res_stun_monitor.conf"
      ],
      "sourceSurfaces": [
        "cli"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_stun_monitor.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_stun_monitor.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_timing_dahdi",
      "kind": "module",
      "family": "res",
      "name": "res_timing_dahdi.so",
      "source": "res/res_timing_dahdi.c",
      "description": "DAHDI Timing Interface",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_timing_dahdi.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_timing_dahdi.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_timing_kqueue",
      "kind": "module",
      "family": "res",
      "name": "res_timing_kqueue.so",
      "source": "res/res_timing_kqueue.c",
      "description": "KQueue Timing Interface",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_timing_kqueue.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_timing_kqueue.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_timing_pthread",
      "kind": "module",
      "family": "res",
      "name": "res_timing_pthread.so",
      "source": "res/res_timing_pthread.c",
      "description": "pthread Timing Interface",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_timing_pthread.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_timing_pthread.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_timing_timerfd",
      "kind": "module",
      "family": "res",
      "name": "res_timing_timerfd.so",
      "source": "res/res_timing_timerfd.c",
      "description": "Timerfd Timing Interface",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_timing_timerfd.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_timing_timerfd.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_tonedetect",
      "kind": "module",
      "family": "res",
      "name": "res_tonedetect.so",
      "source": "res/res_tonedetect.c",
      "description": "Tone detection module",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [],
      "sourceSurfaces": [
        "application",
        "function"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_tonedetect.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_tonedetect.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_websocket_client",
      "kind": "module",
      "family": "res",
      "name": "res_websocket_client.so",
      "source": "res/res_websocket_client.c",
      "description": "WebSocket Client Support",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "websocket_client.conf"
      ],
      "sourceSurfaces": [
        "http"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_websocket_client.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_websocket_client.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    },
    {
      "id": "asterisk.res.res_xmpp",
      "kind": "module",
      "family": "res",
      "name": "res_xmpp.so",
      "source": "res/res_xmpp.c",
      "description": "Asterisk XMPP Interface",
      "buildConditions": [
        "menuselect"
      ],
      "configFiles": [
        "jabber.conf",
        "xmpp.conf",
        "xmpp.conf.sample"
      ],
      "sourceSurfaces": [
        "cli",
        "ami",
        "application",
        "function",
        "tls"
      ],
      "unavailableReasons": [
        "No family-specific menuselect symbol was found for res/res_xmpp.c; configure and menuselect decide whether it is built.",
        "No dedicated source article was found for res/res_xmpp.c; runtime help and the generated module record are the authoritative available documentation."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      }
    }
  ],
  "resources": [
    {
      "id": "asterisk.config.basic.pbx.asterisk.conf",
      "kind": "config",
      "family": "config",
      "name": "basic-pbx/asterisk.conf",
      "source": "configs/basic-pbx/asterisk.conf",
      "description": "Checked-in Asterisk configuration resource configs/basic-pbx/asterisk.conf.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "asterisk.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 474
    },
    {
      "id": "asterisk.config.basic.pbx.cdr.conf",
      "kind": "config",
      "family": "config",
      "name": "basic-pbx/cdr.conf",
      "source": "configs/basic-pbx/cdr.conf",
      "description": "Checked-in Asterisk configuration resource configs/basic-pbx/cdr.conf.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cdr.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 142
    },
    {
      "id": "asterisk.config.basic.pbx.cdr.custom.conf",
      "kind": "config",
      "family": "config",
      "name": "basic-pbx/cdr_custom.conf",
      "source": "configs/basic-pbx/cdr_custom.conf",
      "description": "Checked-in Asterisk configuration resource configs/basic-pbx/cdr_custom.conf.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cdr_custom.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 688
    },
    {
      "id": "asterisk.config.basic.pbx.confbridge.conf",
      "kind": "config",
      "family": "config",
      "name": "basic-pbx/confbridge.conf",
      "source": "configs/basic-pbx/confbridge.conf",
      "description": "Checked-in Asterisk configuration resource configs/basic-pbx/confbridge.conf.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "confbridge.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 104
    },
    {
      "id": "asterisk.config.basic.pbx.extensions.conf",
      "kind": "config",
      "family": "config",
      "name": "basic-pbx/extensions.conf",
      "source": "configs/basic-pbx/extensions.conf",
      "description": "Checked-in Asterisk configuration resource configs/basic-pbx/extensions.conf.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "extensions.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 7516
    },
    {
      "id": "asterisk.config.basic.pbx.indications.conf",
      "kind": "config",
      "family": "config",
      "name": "basic-pbx/indications.conf",
      "source": "configs/basic-pbx/indications.conf",
      "description": "Checked-in Asterisk configuration resource configs/basic-pbx/indications.conf.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "indications.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 699
    },
    {
      "id": "asterisk.config.basic.pbx.logger.conf",
      "kind": "config",
      "family": "config",
      "name": "basic-pbx/logger.conf",
      "source": "configs/basic-pbx/logger.conf",
      "description": "Checked-in Asterisk configuration resource configs/basic-pbx/logger.conf.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "logger.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 169
    },
    {
      "id": "asterisk.config.basic.pbx.modules.conf",
      "kind": "config",
      "family": "config",
      "name": "basic-pbx/modules.conf",
      "source": "configs/basic-pbx/modules.conf",
      "description": "Checked-in Asterisk configuration resource configs/basic-pbx/modules.conf.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "modules.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 2937
    },
    {
      "id": "asterisk.config.basic.pbx.musiconhold.conf",
      "kind": "config",
      "family": "config",
      "name": "basic-pbx/musiconhold.conf",
      "source": "configs/basic-pbx/musiconhold.conf",
      "description": "Checked-in Asterisk configuration resource configs/basic-pbx/musiconhold.conf.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "musiconhold.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 55
    },
    {
      "id": "asterisk.config.basic.pbx.pjsip.conf",
      "kind": "config",
      "family": "config",
      "name": "basic-pbx/pjsip.conf",
      "source": "configs/basic-pbx/pjsip.conf",
      "description": "Checked-in Asterisk configuration resource configs/basic-pbx/pjsip.conf.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "pjsip.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 6688
    },
    {
      "id": "asterisk.config.basic.pbx.pjsip.notify.conf",
      "kind": "config",
      "family": "config",
      "name": "basic-pbx/pjsip_notify.conf",
      "source": "configs/basic-pbx/pjsip_notify.conf",
      "description": "Checked-in Asterisk configuration resource configs/basic-pbx/pjsip_notify.conf.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "pjsip_notify.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 847
    },
    {
      "id": "asterisk.config.basic.pbx.queues.conf",
      "kind": "config",
      "family": "config",
      "name": "basic-pbx/queues.conf",
      "source": "configs/basic-pbx/queues.conf",
      "description": "Checked-in Asterisk configuration resource configs/basic-pbx/queues.conf.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "queues.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 657
    },
    {
      "id": "asterisk.config.basic.pbx.voicemail.conf",
      "kind": "config",
      "family": "config",
      "name": "basic-pbx/voicemail.conf",
      "source": "configs/basic-pbx/voicemail.conf",
      "description": "Checked-in Asterisk configuration resource configs/basic-pbx/voicemail.conf.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "voicemail.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 536
    },
    {
      "id": "asterisk.config.samples.acl.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/acl.conf.sample",
      "source": "configs/samples/acl.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/acl.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "acl.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 2898
    },
    {
      "id": "asterisk.config.samples.adsi.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/adsi.conf.sample",
      "source": "configs/samples/adsi.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/adsi.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "adsi.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 148
    },
    {
      "id": "asterisk.config.samples.aeap.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/aeap.conf.sample",
      "source": "configs/samples/aeap.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/aeap.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "aeap.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 607
    },
    {
      "id": "asterisk.config.samples.agents.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/agents.conf.sample",
      "source": "configs/samples/agents.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/agents.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "agents.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 2167
    },
    {
      "id": "asterisk.config.samples.alarmreceiver.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/alarmreceiver.conf.sample",
      "source": "configs/samples/alarmreceiver.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/alarmreceiver.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "alarmreceiver.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 2419
    },
    {
      "id": "asterisk.config.samples.amd.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/amd.conf.sample",
      "source": "configs/samples/amd.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/amd.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "amd.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 1537
    },
    {
      "id": "asterisk.config.samples.app.skel.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/app_skel.conf.sample",
      "source": "configs/samples/app_skel.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/app_skel.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "app_skel.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 365
    },
    {
      "id": "asterisk.config.samples.ari.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/ari.conf.sample",
      "source": "configs/samples/ari.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/ari.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "ari.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 3302
    },
    {
      "id": "asterisk.config.samples.ast.debug.tools.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/ast_debug_tools.conf.sample",
      "source": "configs/samples/ast_debug_tools.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/ast_debug_tools.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "ast_debug_tools.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 2348
    },
    {
      "id": "asterisk.config.samples.asterisk.adsi",
      "kind": "config",
      "family": "config",
      "name": "samples/asterisk.adsi",
      "source": "configs/samples/asterisk.adsi",
      "description": "Checked-in Asterisk configuration resource configs/samples/asterisk.adsi.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "asterisk.adsi"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 3411
    },
    {
      "id": "asterisk.config.samples.asterisk.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/asterisk.conf.sample",
      "source": "configs/samples/asterisk.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/asterisk.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "asterisk.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 7521
    },
    {
      "id": "asterisk.config.samples.calendar.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/calendar.conf.sample",
      "source": "configs/samples/calendar.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/calendar.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "calendar.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 5372
    },
    {
      "id": "asterisk.config.samples.ccss.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/ccss.conf.sample",
      "source": "configs/samples/ccss.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/ccss.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "ccss.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 9059
    },
    {
      "id": "asterisk.config.samples.cdr.adaptive.odbc.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/cdr_adaptive_odbc.conf.sample",
      "source": "configs/samples/cdr_adaptive_odbc.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/cdr_adaptive_odbc.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cdr_adaptive_odbc.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 2738
    },
    {
      "id": "asterisk.config.samples.cdr.beanstalkd.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/cdr_beanstalkd.conf.sample",
      "source": "configs/samples/cdr_beanstalkd.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/cdr_beanstalkd.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cdr_beanstalkd.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 1072
    },
    {
      "id": "asterisk.config.samples.cdr.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/cdr.conf.sample",
      "source": "configs/samples/cdr.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/cdr.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cdr.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 9279
    },
    {
      "id": "asterisk.config.samples.cdr.custom.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/cdr_custom.conf.sample",
      "source": "configs/samples/cdr_custom.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/cdr_custom.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cdr_custom.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 8684
    },
    {
      "id": "asterisk.config.samples.cdr.manager.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/cdr_manager.conf.sample",
      "source": "configs/samples/cdr_manager.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/cdr_manager.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cdr_manager.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 433
    },
    {
      "id": "asterisk.config.samples.cdr.odbc.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/cdr_odbc.conf.sample",
      "source": "configs/samples/cdr_odbc.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/cdr_odbc.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cdr_odbc.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 369
    },
    {
      "id": "asterisk.config.samples.cdr.pgsql.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/cdr_pgsql.conf.sample",
      "source": "configs/samples/cdr_pgsql.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/cdr_pgsql.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cdr_pgsql.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 866
    },
    {
      "id": "asterisk.config.samples.cdr.sqlite3.custom.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/cdr_sqlite3_custom.conf.sample",
      "source": "configs/samples/cdr_sqlite3_custom.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/cdr_sqlite3_custom.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cdr_sqlite3_custom.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 5803
    },
    {
      "id": "asterisk.config.samples.cdr.tds.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/cdr_tds.conf.sample",
      "source": "configs/samples/cdr_tds.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/cdr_tds.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cdr_tds.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 2144
    },
    {
      "id": "asterisk.config.samples.cel.beanstalkd.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/cel_beanstalkd.conf.sample",
      "source": "configs/samples/cel_beanstalkd.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/cel_beanstalkd.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cel_beanstalkd.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 840
    },
    {
      "id": "asterisk.config.samples.cel.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/cel.conf.sample",
      "source": "configs/samples/cel.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/cel.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cel.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 4433
    },
    {
      "id": "asterisk.config.samples.cel.custom.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/cel_custom.conf.sample",
      "source": "configs/samples/cel_custom.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/cel_custom.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cel_custom.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 13394
    },
    {
      "id": "asterisk.config.samples.cel.odbc.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/cel_odbc.conf.sample",
      "source": "configs/samples/cel_odbc.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/cel_odbc.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cel_odbc.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 3263
    },
    {
      "id": "asterisk.config.samples.cel.pgsql.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/cel_pgsql.conf.sample",
      "source": "configs/samples/cel_pgsql.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/cel_pgsql.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cel_pgsql.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 2018
    },
    {
      "id": "asterisk.config.samples.cel.sqlite3.custom.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/cel_sqlite3_custom.conf.sample",
      "source": "configs/samples/cel_sqlite3_custom.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/cel_sqlite3_custom.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cel_sqlite3_custom.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 6495
    },
    {
      "id": "asterisk.config.samples.cel.tds.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/cel_tds.conf.sample",
      "source": "configs/samples/cel_tds.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/cel_tds.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cel_tds.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 1952
    },
    {
      "id": "asterisk.config.samples.chan.dahdi.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/chan_dahdi.conf.sample",
      "source": "configs/samples/chan_dahdi.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/chan_dahdi.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "chan_dahdi.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 75992
    },
    {
      "id": "asterisk.config.samples.chan.mobile.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/chan_mobile.conf.sample",
      "source": "configs/samples/chan_mobile.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/chan_mobile.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "chan_mobile.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 2295
    },
    {
      "id": "asterisk.config.samples.chan.websocket.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/chan_websocket.conf.sample",
      "source": "configs/samples/chan_websocket.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/chan_websocket.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "chan_websocket.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 521
    },
    {
      "id": "asterisk.config.samples.cli.aliases.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/cli_aliases.conf.sample",
      "source": "configs/samples/cli_aliases.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/cli_aliases.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cli_aliases.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 7272
    },
    {
      "id": "asterisk.config.samples.cli.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/cli.conf.sample",
      "source": "configs/samples/cli.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/cli.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cli.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 1029
    },
    {
      "id": "asterisk.config.samples.cli.permissions.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/cli_permissions.conf.sample",
      "source": "configs/samples/cli_permissions.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/cli_permissions.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "cli_permissions.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 2853
    },
    {
      "id": "asterisk.config.samples.codecs.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/codecs.conf.sample",
      "source": "configs/samples/codecs.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/codecs.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "codecs.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 7883
    },
    {
      "id": "asterisk.config.samples.confbridge.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/confbridge.conf.sample",
      "source": "configs/samples/confbridge.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/confbridge.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "confbridge.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 31206
    },
    {
      "id": "asterisk.config.samples.config.test.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/config_test.conf.sample",
      "source": "configs/samples/config_test.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/config_test.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "config_test.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 858
    },
    {
      "id": "asterisk.config.samples.console.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/console.conf.sample",
      "source": "configs/samples/console.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/console.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "console.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 4553
    },
    {
      "id": "asterisk.config.samples.dbsep.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/dbsep.conf.sample",
      "source": "configs/samples/dbsep.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/dbsep.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "dbsep.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 1197
    },
    {
      "id": "asterisk.config.samples.dnsmgr.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/dnsmgr.conf.sample",
      "source": "configs/samples/dnsmgr.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/dnsmgr.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "dnsmgr.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 194
    },
    {
      "id": "asterisk.config.samples.dsp.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/dsp.conf.sample",
      "source": "configs/samples/dsp.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/dsp.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "dsp.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 1774
    },
    {
      "id": "asterisk.config.samples.dundi.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/dundi.conf.sample",
      "source": "configs/samples/dundi.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/dundi.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "dundi.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 10542
    },
    {
      "id": "asterisk.config.samples.enum.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/enum.conf.sample",
      "source": "configs/samples/enum.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/enum.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "enum.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 614
    },
    {
      "id": "asterisk.config.samples.extconfig.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/extconfig.conf.sample",
      "source": "configs/samples/extconfig.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/extconfig.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "extconfig.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 4217
    },
    {
      "id": "asterisk.config.samples.extensions.ael.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/extensions.ael.sample",
      "source": "configs/samples/extensions.ael.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/extensions.ael.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "extensions.ael"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 12526
    },
    {
      "id": "asterisk.config.samples.extensions.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/extensions.conf.sample",
      "source": "configs/samples/extensions.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/extensions.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "extensions.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 32805
    },
    {
      "id": "asterisk.config.samples.extensions.lua.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/extensions.lua.sample",
      "source": "configs/samples/extensions.lua.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/extensions.lua.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "extensions.lua"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 7021
    },
    {
      "id": "asterisk.config.samples.extensions.minivm.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/extensions_minivm.conf.sample",
      "source": "configs/samples/extensions_minivm.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/extensions_minivm.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "extensions_minivm.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 7744
    },
    {
      "id": "asterisk.config.samples.features.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/features.conf.sample",
      "source": "configs/samples/features.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/features.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "features.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 8378
    },
    {
      "id": "asterisk.config.samples.festival.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/festival.conf.sample",
      "source": "configs/samples/festival.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/festival.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "festival.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 956
    },
    {
      "id": "asterisk.config.samples.followme.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/followme.conf.sample",
      "source": "configs/samples/followme.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/followme.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "followme.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 4645
    },
    {
      "id": "asterisk.config.samples.func.odbc.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/func_odbc.conf.sample",
      "source": "configs/samples/func_odbc.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/func_odbc.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "func_odbc.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 7184
    },
    {
      "id": "asterisk.config.samples.geolocation.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/geolocation.conf.sample",
      "source": "configs/samples/geolocation.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/geolocation.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "geolocation.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 12219
    },
    {
      "id": "asterisk.config.samples.hep.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/hep.conf.sample",
      "source": "configs/samples/hep.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/hep.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "hep.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 1960
    },
    {
      "id": "asterisk.config.samples.http.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/http.conf.sample",
      "source": "configs/samples/http.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/http.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "http.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 6782
    },
    {
      "id": "asterisk.config.samples.iax.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/iax.conf.sample",
      "source": "configs/samples/iax.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/iax.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "iax.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 27327
    },
    {
      "id": "asterisk.config.samples.iaxprov.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/iaxprov.conf.sample",
      "source": "configs/samples/iaxprov.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/iaxprov.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "iaxprov.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 2494
    },
    {
      "id": "asterisk.config.samples.indications.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/indications.conf.sample",
      "source": "configs/samples/indications.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/indications.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "indications.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 26406
    },
    {
      "id": "asterisk.config.samples.logger.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/logger.conf.sample",
      "source": "configs/samples/logger.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/logger.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "logger.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 7794
    },
    {
      "id": "asterisk.config.samples.manager.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/manager.conf.sample",
      "source": "configs/samples/manager.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/manager.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "manager.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 14671
    },
    {
      "id": "asterisk.config.samples.meetme.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/meetme.conf.sample",
      "source": "configs/samples/meetme.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/meetme.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "meetme.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 1563
    },
    {
      "id": "asterisk.config.samples.minivm.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/minivm.conf.sample",
      "source": "configs/samples/minivm.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/minivm.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "minivm.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 10131
    },
    {
      "id": "asterisk.config.samples.modules.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/modules.conf.sample",
      "source": "configs/samples/modules.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/modules.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "modules.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 1540
    },
    {
      "id": "asterisk.config.samples.motif.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/motif.conf.sample",
      "source": "configs/samples/motif.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/motif.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "motif.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 4768
    },
    {
      "id": "asterisk.config.samples.musiconhold.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/musiconhold.conf.sample",
      "source": "configs/samples/musiconhold.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/musiconhold.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "musiconhold.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 6831
    },
    {
      "id": "asterisk.config.samples.ooh323.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/ooh323.conf.sample",
      "source": "configs/samples/ooh323.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/ooh323.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "ooh323.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 6115
    },
    {
      "id": "asterisk.config.samples.phoneprov.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/phoneprov.conf.sample",
      "source": "configs/samples/phoneprov.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/phoneprov.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "phoneprov.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 7934
    },
    {
      "id": "asterisk.config.samples.phoneprov.users.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/phoneprov_users.conf.sample",
      "source": "configs/samples/phoneprov_users.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/phoneprov_users.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "phoneprov_users.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 655
    },
    {
      "id": "asterisk.config.samples.pjproject.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/pjproject.conf.sample",
      "source": "configs/samples/pjproject.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/pjproject.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "pjproject.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 3125
    },
    {
      "id": "asterisk.config.samples.pjsip.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/pjsip.conf.sample",
      "source": "configs/samples/pjsip.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/pjsip.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "pjsip.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 93418
    },
    {
      "id": "asterisk.config.samples.pjsip.notify.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/pjsip_notify.conf.sample",
      "source": "configs/samples/pjsip_notify.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/pjsip_notify.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "pjsip_notify.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 1169
    },
    {
      "id": "asterisk.config.samples.pjsip.wizard.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/pjsip_wizard.conf.sample",
      "source": "configs/samples/pjsip_wizard.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/pjsip_wizard.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "pjsip_wizard.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 9305
    },
    {
      "id": "asterisk.config.samples.prometheus.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/prometheus.conf.sample",
      "source": "configs/samples/prometheus.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/prometheus.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "prometheus.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 3779
    },
    {
      "id": "asterisk.config.samples.queuerules.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/queuerules.conf.sample",
      "source": "configs/samples/queuerules.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/queuerules.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "queuerules.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 3243
    },
    {
      "id": "asterisk.config.samples.queues.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/queues.conf.sample",
      "source": "configs/samples/queues.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/queues.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "queues.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 26628
    },
    {
      "id": "asterisk.config.samples.res.config.mysql.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/res_config_mysql.conf.sample",
      "source": "configs/samples/res_config_mysql.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/res_config_mysql.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "res_config_mysql.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 2113
    },
    {
      "id": "asterisk.config.samples.res.config.odbc.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/res_config_odbc.conf.sample",
      "source": "configs/samples/res_config_odbc.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/res_config_odbc.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "res_config_odbc.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 545
    },
    {
      "id": "asterisk.config.samples.res.config.sqlite3.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/res_config_sqlite3.conf.sample",
      "source": "configs/samples/res_config_sqlite3.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/res_config_sqlite3.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "res_config_sqlite3.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 1528
    },
    {
      "id": "asterisk.config.samples.res.corosync.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/res_corosync.conf.sample",
      "source": "configs/samples/res_corosync.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/res_corosync.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "res_corosync.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 907
    },
    {
      "id": "asterisk.config.samples.res.curl.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/res_curl.conf.sample",
      "source": "configs/samples/res_curl.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/res_curl.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "res_curl.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 6627
    },
    {
      "id": "asterisk.config.samples.res.fax.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/res_fax.conf.sample",
      "source": "configs/samples/res_fax.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/res_fax.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "res_fax.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 1103
    },
    {
      "id": "asterisk.config.samples.res.http.media.cache.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/res_http_media_cache.conf.sample",
      "source": "configs/samples/res_http_media_cache.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/res_http_media_cache.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "res_http_media_cache.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 2040
    },
    {
      "id": "asterisk.config.samples.res.ldap.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/res_ldap.conf.sample",
      "source": "configs/samples/res_ldap.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/res_ldap.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "res_ldap.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 4926
    },
    {
      "id": "asterisk.config.samples.res.odbc.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/res_odbc.conf.sample",
      "source": "configs/samples/res_odbc.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/res_odbc.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "res_odbc.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 7116
    },
    {
      "id": "asterisk.config.samples.res.parking.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/res_parking.conf.sample",
      "source": "configs/samples/res_parking.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/res_parking.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "res_parking.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 11205
    },
    {
      "id": "asterisk.config.samples.res.pgsql.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/res_pgsql.conf.sample",
      "source": "configs/samples/res_pgsql.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/res_pgsql.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "res_pgsql.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 1405
    },
    {
      "id": "asterisk.config.samples.res.snmp.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/res_snmp.conf.sample",
      "source": "configs/samples/res_snmp.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/res_snmp.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "res_snmp.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 691
    },
    {
      "id": "asterisk.config.samples.res.stun.monitor.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/res_stun_monitor.conf.sample",
      "source": "configs/samples/res_stun_monitor.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/res_stun_monitor.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "res_stun_monitor.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 1360
    },
    {
      "id": "asterisk.config.samples.resolver.unbound.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/resolver_unbound.conf.sample",
      "source": "configs/samples/resolver_unbound.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/resolver_unbound.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "resolver_unbound.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 1549
    },
    {
      "id": "asterisk.config.samples.rtp.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/rtp.conf.sample",
      "source": "configs/samples/rtp.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/rtp.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "rtp.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 8077
    },
    {
      "id": "asterisk.config.samples.say.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/say.conf.sample",
      "source": "configs/samples/say.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/say.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "say.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 17462
    },
    {
      "id": "asterisk.config.samples.sla.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/sla.conf.sample",
      "source": "configs/samples/sla.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/sla.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "sla.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 7256
    },
    {
      "id": "asterisk.config.samples.smdi.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/smdi.conf.sample",
      "source": "configs/samples/smdi.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/smdi.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "smdi.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 2744
    },
    {
      "id": "asterisk.config.samples.sorcery.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/sorcery.conf.sample",
      "source": "configs/samples/sorcery.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/sorcery.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "sorcery.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 3056
    },
    {
      "id": "asterisk.config.samples.ss7.timers.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/ss7.timers.sample",
      "source": "configs/samples/ss7.timers.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/ss7.timers.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "ss7.timers"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 1568
    },
    {
      "id": "asterisk.config.samples.stasis.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/stasis.conf.sample",
      "source": "configs/samples/stasis.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/stasis.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "stasis.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 5317
    },
    {
      "id": "asterisk.config.samples.statsd.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/statsd.conf.sample",
      "source": "configs/samples/statsd.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/statsd.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "statsd.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 551
    },
    {
      "id": "asterisk.config.samples.stir.shaken.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/stir_shaken.conf.sample",
      "source": "configs/samples/stir_shaken.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/stir_shaken.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "stir_shaken.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 20277
    },
    {
      "id": "asterisk.config.samples.telcordia.1.adsi",
      "kind": "config",
      "family": "config",
      "name": "samples/telcordia-1.adsi",
      "source": "configs/samples/telcordia-1.adsi",
      "description": "Checked-in Asterisk configuration resource configs/samples/telcordia-1.adsi.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "telcordia-1.adsi"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 1467
    },
    {
      "id": "asterisk.config.samples.test.sorcery.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/test_sorcery.conf.sample",
      "source": "configs/samples/test_sorcery.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/test_sorcery.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "test_sorcery.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 166
    },
    {
      "id": "asterisk.config.samples.udptl.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/udptl.conf.sample",
      "source": "configs/samples/udptl.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/udptl.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "udptl.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 682
    },
    {
      "id": "asterisk.config.samples.unistim.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/unistim.conf.sample",
      "source": "configs/samples/unistim.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/unistim.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "unistim.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 5951
    },
    {
      "id": "asterisk.config.samples.voicemail.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/voicemail.conf.sample",
      "source": "configs/samples/voicemail.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/voicemail.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "voicemail.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 31471
    },
    {
      "id": "asterisk.config.samples.websocket.client.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/websocket_client.conf.sample",
      "source": "configs/samples/websocket_client.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/websocket_client.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "websocket_client.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 9506
    },
    {
      "id": "asterisk.config.samples.xmpp.conf.sample",
      "kind": "config",
      "family": "config",
      "name": "samples/xmpp.conf.sample",
      "source": "configs/samples/xmpp.conf.sample",
      "description": "Checked-in Asterisk configuration resource configs/samples/xmpp.conf.sample.",
      "buildConditions": [
        "runtime-config"
      ],
      "configFiles": [
        "xmpp.conf"
      ],
      "sourceSurfaces": [
        "configuration"
      ],
      "docsSource": "console/docs/system/modules.md",
      "unavailableReasons": [
        "A target-specific read is required before this resource can be edited; checked-in samples are not live values."
      ],
      "runtime": {
        "state": "unverified",
        "reason": "A live target has not reconciled this source record yet."
      },
      "bytes": 3798
    }
  ]
} as const;
