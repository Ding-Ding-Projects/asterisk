// @ts-nocheck
/* GENERATED FILE — do not edit.
 * Produced by console/scripts/compile-design.mjs from the checked-in design reference.
 * Edit the design reference and recompile instead. */
import { DCLogic, h, F, A, R, S, fn, sty } from '../dc-runtime';
import M3Control from './m3-control';
function Template(v: any) {
  return F(
    h("div", { style: sty(`height:100%; display:flex; flex-direction:column; background:#0B0F0C; color:#DFE4DC; font-family:Roboto,system-ui,sans-serif; font-size:14px; overflow:hidden; position:relative;`) },
      h("div", { style: sty(`height:40px; flex:0 0 40px; display:flex; align-items:stretch; background:#141A15; user-select:none; overflow:hidden; min-width:0;`), "data-window-drag": `` },
        h("div", { style: sty(`display:flex; align-items:center; gap:10px; padding:0 12px; flex:0 0 auto; white-space:nowrap;`) },
          h("span", { style: sty(`font-size:20px; color:#82D9A5; flex:0 0 auto;`), className: "msym" },
            "deployed_code"
          ),
          h("span", { style: sty(`font-size:13px; font-weight:500; letter-spacing:.1px; white-space:nowrap; flex:0 0 auto;`) },
            "Ding PBX Console"
          )
        ),
        h("div", { style: sty(`display:flex; align-items:stretch; min-width:0; overflow-x:auto; flex:0 1 auto;`) },
          A(v.menus).map(($m, $m$i) => R($m$i, h("button", { onClick: fn($m.open), style: sty(`background:transparent; border:0; color:#C4CBC2; font:inherit; font-size:13px; padding:0 12px; cursor:pointer; border-radius:8px; margin:5px 1px;`), className: "k-h0" },
              S($m.label)
            )))
        ),
        h("div", { style: sty(`flex:1 1 0; min-width:0; display:flex; align-items:center; justify-content:center; overflow:hidden;`) },
          h("button", { onClick: fn(v.openConnection), style: sty(`display:flex; align-items:center; gap:8px; background:#1B211C; border:1px solid #414942; border-radius:999px; padding:5px 14px 5px 10px; color:#C4CBC2; font:inherit; font-size:12px; cursor:pointer; white-space:nowrap; flex:0 1 auto; min-width:0; overflow:hidden; height:28px;`), className: "k-h1" },
            h("span", { style: sty(`width:8px; height:8px; border-radius:50%; background:#82D9A5; animation:m3Pulse 2.4s ease-in-out infinite; flex:0 0 auto;`) }),
            h("span", { style: sty(`font-family:'Roboto Mono',monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0;`) },
              S(v.connLabel)
            ),
            h("span", { style: sty(`color:#6B736C; flex:0 0 auto;`) },
              "·"
            ),
            h("span", { style: sty(`font-family:'Roboto Mono',monospace; color:#9AA39B; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0;`) },
              S(v.connUptime)
            )
          )
        ),
        h("div", { style: sty(`display:flex; align-items:center; gap:8px; padding-right:4px; flex:0 0 auto;`) },
          h("div", { style: sty(`display:flex; border:1px solid #414942; border-radius:999px; overflow:hidden; height:28px;`) },
            A(v.modeOpts).map(($o, $o$i) => R($o$i, F(
              ($o.on ? h("button", { onClick: fn($o.pick), style: sty(`display:flex; align-items:center; gap:5px; background:#005230; color:#9FF7C4; border:0; padding:0 13px; font:inherit; font-size:12px; font-weight:500; cursor:pointer;`) },
                  h("span", { style: sty(`font-size:15px;`), className: "msym" },
                    "check"
                  ),
                  S($o.label)
                ) : null),
              ($o.off ? h("button", { onClick: fn($o.pick), style: sty(`background:transparent; color:#9AA39B; border:0; padding:0 13px; font:inherit; font-size:12px; cursor:pointer;`), className: "k-h2" },
                  S($o.label)
                ) : null)
            )))
          ),
          h("button", { onClick: fn(v.goArcade), title: `Confirmation credits — win more in the arcade`, style: sty(`display:flex; align-items:center; gap:6px; background:#1B4D33; border:0; border-radius:999px; padding:5px 12px 5px 9px; color:#9FF7C4; font:inherit; font-size:12px; font-weight:500; cursor:pointer; height:28px; white-space:nowrap;`), className: "k-h3" },
            h("span", { style: sty(`font-size:16px;`), className: "msym" },
              "confirmation_number"
            ),
            S(v.credits)
          ),
          h("button", { onClick: fn(v.togglePalette), title: `Command palette (Ctrl+Shift+F)`, style: sty(`width:32px; height:32px; border-radius:50%; background:transparent; border:0; color:#9AA39B; cursor:pointer; display:flex; align-items:center; justify-content:center;`), className: "k-h4" },
            h("span", { style: sty(`font-size:19px;`), className: "msym" },
              "search"
            )
          ),
          h("div", { style: sty(`display:flex;`) },
            h("div", { style: sty(`width:34px; height:32px; display:flex; align-items:center; justify-content:center; color:#9AA39B; border-radius:8px;`), onClick: fn(v.__window?.minimize), "data-window-button": ``, title: `Minimize`, className: "k-h1" },
              h("span", { style: sty(`font-size:17px;`), className: "msym" },
                "remove"
              )
            ),
            h("div", { style: sty(`width:34px; height:32px; display:flex; align-items:center; justify-content:center; color:#9AA39B; border-radius:8px;`), onClick: fn(v.__window?.toggleMaximize), "data-window-button": ``, title: `Maximize`, className: "k-h1" },
              h("span", { style: sty(`font-size:15px;`), className: "msym" },
                "crop_square"
              )
            ),
            h("div", { style: sty(`width:34px; height:32px; display:flex; align-items:center; justify-content:center; color:#9AA39B; border-radius:8px;`), onClick: fn(v.__window?.close), "data-window-button": ``, title: `Close`, className: "k-h5" },
              h("span", { style: sty(`font-size:17px;`), className: "msym" },
                "close"
              )
            )
          )
        )
      ),
      h("div", { style: sty(`height:38px; flex:0 0 38px; display:flex; align-items:flex-end; gap:2px; background:#0B0F0C; padding:0 6px; overflow-x:auto;`) },
        A(v.tabGroups).map(($g, $g$i) => R($g$i, h("div", { onClick: fn($g.toggle), onContextMenu: fn($g.ctx), style: sty(`display:flex; align-items:center; gap:7px; animation:tabIn .24s cubic-bezier(.2,1.3,.4,1); background:${S($g.bg)}; border-radius:10px 10px 0 0; padding:8px 12px; margin-bottom:0; cursor:pointer; flex:0 0 auto; border-top:2px solid ${S($g.colour)};`) },
            h("span", { style: sty(`width:9px; height:9px; border-radius:50%; background:${S($g.colour)};`) }),
            h("span", { style: sty(`font-size:12px; font-weight:500; color:#DFE4DC; white-space:nowrap;`) },
              S($g.name)
            ),
            h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#8FA394;`) },
              S($g.count)
            ),
            h("span", { style: sty(`font-size:16px; color:#9AA39B;`), className: "msym" },
              S($g.chevron)
            )
          ))),
        A(v.tabs).map(($t, $t$i) => R($t$i, F(
          ($t.on ? h("div", { draggable: `true`, onDragStart: fn($t.onDragStart), onDragOver: fn($t.onDragOver), onDrop: fn($t.onDrop), onDragEnd: fn($t.onDragEnd), onClick: fn($t.go), onContextMenu: fn($t.ctx), style: sty(`display:flex; align-items:center; gap:8px; background:#141A15; border-radius:10px 10px 0 0; padding:8px 10px 8px 13px; cursor:grab; animation:tabIn .22s cubic-bezier(.2,1.3,.4,1); max-width:230px; min-width:130px; border-top:2px solid #82D9A5; border-left:2px solid ${S($t.edge)}; border-right:2px solid ${S($t.edge)};`) },
              ($t.inGroup ? h("span", { style: sty(`width:3px; height:18px; border-radius:2px; background:${S($t.groupColour)}; flex:0 0 auto;`) }) : null),
              h("span", { style: sty(`width:7px; height:7px; border-radius:50%; background:${S($t.colour)}; flex:0 0 auto;`) }),
              h("span", { style: sty(`font-size:16px; color:#82D9A5; flex:0 0 auto;`), className: "msym" },
                S($t.icon)
              ),
              h("span", { style: sty(`flex:1; font-size:12.5px; color:#DFE4DC; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                S($t.label)
              ),
              ($t.pinned ? h("span", { style: sty(`font-size:14px; color:#8FA394;`), className: "msym" },
                  "push_pin"
                ) : null),
              h("button", { onClick: fn($t.close), style: sty(`width:24px; height:24px; border-radius:50%; background:transparent; border:0; color:#9AA39B; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto;`), className: "k-h6" },
                h("span", { style: sty(`font-size:14px;`), className: "msym" },
                  "close"
                )
              )
            ) : null),
          ($t.off ? h("div", { draggable: `true`, onDragStart: fn($t.onDragStart), onDragOver: fn($t.onDragOver), onDrop: fn($t.onDrop), onDragEnd: fn($t.onDragEnd), onClick: fn($t.go), onContextMenu: fn($t.ctx), style: sty(`display:flex; align-items:center; gap:8px; background:#0F1510; border-radius:10px 10px 0 0; padding:8px 10px 8px 13px; cursor:grab; animation:tabIn .22s cubic-bezier(.2,1.3,.4,1); max-width:200px; min-width:110px; border-top:2px solid transparent; border-left:2px solid ${S($t.edge)}; border-right:2px solid ${S($t.edge)};`), className: "k-h7" },
              ($t.inGroup ? h("span", { style: sty(`width:3px; height:18px; border-radius:2px; background:${S($t.groupColour)}; flex:0 0 auto;`) }) : null),
              h("span", { style: sty(`font-size:16px; color:#8FA394; flex:0 0 auto;`), className: "msym" },
                S($t.icon)
              ),
              h("span", { style: sty(`flex:1; font-size:12.5px; color:#9AA39B; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                S($t.label)
              ),
              ($t.pinned ? h("span", { style: sty(`font-size:14px; color:#778078;`), className: "msym" },
                  "push_pin"
                ) : null),
              h("button", { onClick: fn($t.close), style: sty(`width:24px; height:24px; border-radius:50%; background:transparent; border:0; color:#778078; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto;`), className: "k-h6" },
                h("span", { style: sty(`font-size:14px;`), className: "msym" },
                  "close"
                )
              )
            ) : null)
        ))),
        h("button", { onClick: fn(v.newTab), title: `New tab`, style: sty(`width:30px; height:30px; margin-bottom:3px; border-radius:8px; background:transparent; border:0; color:#9AA39B; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto;`), className: "k-h8" },
          h("span", { style: sty(`font-size:18px;`), className: "msym" },
            "add"
          )
        ),
        h("div", { style: sty(`flex:1;`) }),
        h("div", { style: sty(`display:flex; align-items:center; gap:4px; padding-bottom:4px;`) },
          h("span", { style: sty(`font-size:11px; color:#778078;`) },
            "Dock"
          ),
          A(v.dockOpts).map(($d, $d$i) => R($d$i, F(
            ($d.on ? h("button", { onClick: fn($d.pick), title: $d.label, style: sty(`width:26px; height:26px; border-radius:7px; background:#005230; border:0; color:#9FF7C4; cursor:pointer; display:flex; align-items:center; justify-content:center;`) },
                h("span", { style: sty(`font-size:16px;`), className: "msym" },
                  S($d.icon)
                )
              ) : null),
            ($d.off ? h("button", { onClick: fn($d.pick), title: $d.label, style: sty(`width:26px; height:26px; border-radius:7px; background:transparent; border:0; color:#778078; cursor:pointer; display:flex; align-items:center; justify-content:center;`), className: "k-h9" },
                h("span", { style: sty(`font-size:16px;`), className: "msym" },
                  S($d.icon)
                )
              ) : null)
          )))
        )
      ),
      h("div", { style: sty(`flex:1; display:flex; min-height:0; gap:0; flex-direction:${S(v.dockDirection)};`) },
        h("div", { style: sty(`width:88px; flex:0 0 88px; background:#0B0F0C; display:flex; flex-direction:column; align-items:center; padding:8px 0 12px; gap:4px; overflow-y:auto;`) },
          A(v.rail).map(($r, $r$i) => R($r$i, h("button", { onClick: fn($r.pick), style: sty(`width:100%; background:transparent; border:0; cursor:pointer; padding:4px 0 2px; display:flex; flex-direction:column; align-items:center; gap:4px;`) },
              ($r.on ? h("span", { style: sty(`width:56px; height:32px; border-radius:16px; background:#005230; display:flex; align-items:center; justify-content:center; animation:m3Ripple .5s ease-out;`) },
                  h("span", { style: sty(`font-size:22px; color:#9FF7C4;`), className: "msym" },
                    S($r.icon)
                  )
                ) : null),
              ($r.off ? h("span", { style: sty(`width:56px; height:32px; border-radius:16px; background:transparent; display:flex; align-items:center; justify-content:center;`), className: "k-h10" },
                  h("span", { style: sty(`font-size:22px; color:#B6BEB5;`), className: "msym" },
                    S($r.icon)
                  )
                ) : null),
              h("span", { style: sty(`font-size:11px; font-weight:500; letter-spacing:.3px; color:#C4CBC2;`) },
                S($r.label)
              )
            ))),
          h("div", { style: sty(`flex:1;`) }),
          h("button", { onClick: fn(v.startOnboarding), title: `Re-run setup`, style: sty(`width:56px; height:56px; border-radius:18px; background:#1B4D33; border:0; color:#9FF7C4; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,.4);`), className: "k-h3" },
            h("span", { style: sty(`font-size:24px;`), className: "msym" },
              "rocket_launch"
            )
          )
        ),
        h("div", { style: sty(`width:268px; flex:0 0 268px; background:#141A15; border-radius:16px 0 0 0; display:flex; flex-direction:column; min-height:0;`) },
          h("div", { style: sty(`padding:16px 18px 12px;`) },
            h("div", { style: sty(`font-size:11px; letter-spacing:1.1px; text-transform:uppercase; color:#8FA394; font-weight:500;`) },
              S(v.groupLabel)
            ),
            h("div", { style: sty(`font-size:12.5px; color:#9AA39B; margin-top:5px; line-height:1.5;`) },
              S(v.groupDesc)
            )
          ),
          h("div", { style: sty(`padding:0 12px 10px;`) },
            h("div", { onContextMenu: fn(v.ctxSearch), style: sty(`display:flex; align-items:center; gap:8px; background:#1B211C; border-radius:999px; padding:7px 8px 7px 13px;`) },
              h("span", { style: sty(`font-size:17px; color:#9AA39B;`), className: "msym" },
                "search"
              ),
              h("span", { style: sty(`flex:1; font-family:'Roboto Mono',monospace; font-size:11.5px; color:#C4CBC2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                S(v.navSearchLabel)
              ),
              h("button", { onClick: fn(v.openNavRegex), title: `Regex builder`, style: sty(`width:26px; height:26px; border-radius:50%; background:#262B26; border:0; color:#82D9A5; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto;`), className: "k-h11" },
                h("span", { style: sty(`font-size:15px;`), className: "msym" },
                  "data_object"
                )
              )
            )
          ),
          h("div", { style: sty(`flex:1; overflow-y:auto; padding:0 10px 8px;`) },
            A(v.sections).map(($s, $s$i) => R($s$i, F(
              ($s.on ? h("button", { onClick: fn($s.pick), style: sty(`width:100%; text-align:left; background:#005230; border:0; border-radius:999px; padding:9px 14px; margin-bottom:3px; cursor:pointer; display:flex; align-items:center; gap:11px; animation:m3Bounce .32s cubic-bezier(.2,1.3,.4,1);`) },
                  h("span", { style: sty(`font-size:19px; color:#9FF7C4;`), className: "msym" },
                    S($s.icon)
                  ),
                  h("span", { style: sty(`flex:1; font-size:13.5px; color:#DFF3E5; font-weight:500;`) },
                    S($s.label)
                  ),
                  h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#9FF7C4;`) },
                    S($s.badge)
                  )
                ) : null),
              ($s.off ? h("button", { onClick: fn($s.pick), style: sty(`width:100%; text-align:left; background:transparent; border:0; border-radius:999px; padding:9px 14px; margin-bottom:3px; cursor:pointer; display:flex; align-items:center; gap:11px;`), className: "k-h10" },
                  h("span", { style: sty(`font-size:19px; color:#9AA39B;`), className: "msym" },
                    S($s.icon)
                  ),
                  h("span", { style: sty(`flex:1; font-size:13.5px; color:#C4CBC2;`) },
                    S($s.label)
                  ),
                  h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#778078;`) },
                    S($s.badge)
                  )
                ) : null)
            )))
          ),
          h("div", { style: sty(`padding:12px 16px; display:flex; align-items:center; gap:9px; border-top:1px solid #262B26;`) },
            h("span", { style: sty(`font-size:17px; color:#82D9A5;`), className: "msym" },
              "cloud_done"
            ),
            h("span", { style: sty(`font-size:11.5px; color:#9AA39B; font-family:'Roboto Mono',monospace;`) },
              S(v.dirtyLabel)
            )
          )
        ),
        h("div", { style: sty(`flex:1; min-width:0; display:flex; flex-direction:column; background:#0F1510;`) },
          h("div", { style: sty(`padding:20px 26px 16px; display:flex; align-items:flex-start; gap:16px;`) },
            h("div", { style: sty(`flex:1; min-width:0;`) },
              h("div", { style: sty(`display:flex; align-items:center; gap:10px;`) },
                h("h1", { style: sty(`margin:0; font-size:22px; font-weight:400; letter-spacing:0;`) },
                  S(v.screenTitle)
                ),
                (v.expertMode ? h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#9FF7C4; background:#1B4D33; border-radius:8px; padding:3px 9px;`) },
                    S(v.screenFile)
                  ) : null)
              ),
              h("p", { style: sty(`margin:7px 0 0; font-size:13px; color:#9AA39B; line-height:1.55; max-width:78ch; text-wrap:pretty;`) },
                S(v.screenSub)
              )
            ),
            h("div", { style: sty(`display:flex; gap:8px; flex:0 0 auto;`) },
              h("button", { onClick: fn(v.openInfoScreen), style: sty(`background:transparent; border:1px solid #414942; border-radius:999px; color:#C4CBC2; font:inherit; font-size:13px; font-weight:500; padding:9px 16px 9px 12px; cursor:pointer; display:flex; align-items:center; gap:7px;`), className: "k-h10" },
                h("span", { style: sty(`font-size:18px; color:#82D9A5;`), className: "msym" },
                  "help"
                ),
                "Explain"
              ),
              h("button", { onClick: fn(v.openWizard), style: sty(`background:#82D9A5; border:0; border-radius:999px; color:#00391F; font:inherit; font-size:13px; font-weight:500; padding:10px 20px 10px 15px; cursor:pointer; display:flex; align-items:center; gap:7px;`), className: "k-h12" },
                h("span", { style: sty(`font-size:18px;`), className: "msym" },
                  "auto_fix_high"
                ),
                "Guided wizard"
              )
            )
          ),
          h("div", { onContextMenu: fn(v.ctxScreen), key: v.screenKey, style: sty(`flex:1; overflow-y:auto; padding:0 26px 80px; position:relative; animation:screenIn .3s cubic-bezier(.2,0,0,1);`) },
            (v.beginner ? h("div", { style: sty(`display:flex; align-items:center; gap:13px; background:#1B4D33; border-radius:16px; padding:14px 18px; margin-bottom:12px; animation:m3Slide .3s cubic-bezier(.2,0,0,1);`) },
                h("span", { style: sty(`font-size:24px; color:#9FF7C4; flex:0 0 auto;`), className: "msym" },
                  "school"
                ),
                h("div", { style: sty(`flex:1; min-width:0;`) },
                  h("div", { style: sty(`font-size:13.5px; color:#DFF3E5; line-height:1.5;`) },
                    S(v.beginnerNote)
                  ),
                  h("div", { style: sty(`font-size:11.5px; color:#9FF7C4; margin-top:4px;`) },
                    `${S(v.hiddenCount)} — switch to Expert in the title bar to see them with their real config keys.`
                  )
                ),
                h("button", { onClick: fn(v.openWizard), style: sty(`background:#9FF7C4; border:0; border-radius:999px; padding:10px 18px; color:#00391F; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; flex:0 0 auto;`) },
                  "Do it with a wizard"
                )
              ) : null),
            (v.expertMode ? h("div", { style: sty(`display:flex; align-items:center; gap:12px; background:#141A15; border:1px solid #262B26; border-radius:12px; padding:9px 14px; margin-bottom:12px; font-family:'Roboto Mono',monospace; font-size:11.5px; color:#8FA394;`) },
                h("span", { style: sty(`font-size:16px; color:#82D9A5;`), className: "msym" },
                  "terminal"
                ),
                h("span", { style: sty(`flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                  S(v.expertLine)
                ),
                h("span", { style: sty(`color:#9FF7C4;`) },
                  S(v.expertCount)
                )
              ) : null),
            (v.screenLocked ? F(
              h("div", { style: sty(`position:sticky; top:0; z-index:6; display:flex; align-items:center; gap:12px; background:#4A1F1B; border-radius:14px; padding:12px 16px; margin-bottom:12px; box-shadow:0 4px 16px rgba(0,0,0,.4);`) },
                h("span", { style: sty(`font-size:22px; color:#FFB4AB;`), className: "msym" },
                  "lock"
                ),
                h("div", { style: sty(`flex:1;`) },
                  h("div", { style: sty(`font-size:13.5px; font-weight:500; color:#FFDAD6;`) },
                    `${S(v.lockedTitle)} is locked — contents visible, controls disabled`
                  ),
                  h("div", { style: sty(`font-size:11.5px; color:#F4B9B2; margin-top:2px;`) },
                    "Click anything below and the credential prompt opens. Recovery: delete %APPDATA%\\DingPbxConsole\\locks"
                  )
                ),
                h("button", { onClick: fn(v.openUnlock), style: sty(`background:#FFB4AB; border:0; border-radius:999px; padding:9px 20px; color:#5C1B18; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; flex:0 0 auto;`) },
                  "Unlock"
                )
              ),
              h("div", { onClick: fn(v.openUnlock), style: sty(`position:absolute; left:26px; right:26px; top:74px; bottom:0; z-index:5; cursor:not-allowed; background:rgba(11,15,12,.45);`) })
            ) : null),
            (v.isDashboard ? F(
              h("div", { style: sty(`display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:14px;`) },
                A(v.stats).map(($k, $k$i) => R($k$i, h("div", { style: sty(`background:#1B211C; border-radius:16px; padding:16px 18px; animation:m3Rise .34s cubic-bezier(.2,1.1,.35,1) both; ${S($k.rnd)}`) },
                    h("div", { style: sty(`display:flex; align-items:center; gap:8px;`) },
                      h("span", { style: sty(`font-size:18px; color:#82D9A5; animation:m3Float 4s ease-in-out infinite;`), className: "msym" },
                        S($k.icon)
                      ),
                      h("span", { style: sty(`font-size:11.5px; letter-spacing:.6px; text-transform:uppercase; color:#9AA39B; font-weight:500;`) },
                        S($k.label)
                      )
                    ),
                    h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:30px; font-weight:500; margin-top:10px; color:#DFE4DC;`) },
                      S($k.value)
                    ),
                    h("div", { style: sty(`font-size:11.5px; color:#8FA394; margin-top:2px;`) },
                      S($k.delta)
                    )
                  )))
              ),
              h("div", { style: sty(`display:grid; grid-template-columns:1.6fr 1fr; gap:12px;`) },
                h("div", { style: sty(`background:#1B211C; border-radius:16px; padding:16px 18px;`) },
                  h("div", { style: sty(`display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;`) },
                    h("span", { style: sty(`font-size:15px; font-weight:500;`) },
                      "Live channels"
                    ),
                    h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#9AA39B;`) },
                      "refreshing 1s"
                    )
                  ),
                  h("div", { style: sty(`display:flex; flex-direction:column; gap:6px;`) },
                    A(v.liveCalls).map(($c, $c$i) => R($c$i, h("div", { style: sty(`display:grid; grid-template-columns:minmax(120px,1.4fr) minmax(80px,1fr) 74px 96px; align-items:center; gap:10px; background:#141A15; border-radius:12px; padding:10px 12px; animation:m3Slide .3s cubic-bezier(.2,0,0,1) both;`) },
                        h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12px; color:#DFE4DC; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                          S($c.chan)
                        ),
                        h("span", { style: sty(`font-size:12px; color:#9AA39B;`) },
                          S($c.peer)
                        ),
                        h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12px; color:#82D9A5;`) },
                          S($c.dur)
                        ),
                        h("div", { style: sty(`display:flex; gap:4px; justify-content:flex-end; padding-right:2px;`) },
                          h("button", { onClick: fn($c.spy), title: `Listen (ChanSpy)`, style: sty(`width:28px; height:28px; border-radius:50%; background:#262B26; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h13" },
                            h("span", { style: sty(`font-size:16px;`), className: "msym" },
                              "hearing"
                            )
                          ),
                          h("button", { onClick: fn($c.rec), title: `MixMonitor`, style: sty(`width:28px; height:28px; border-radius:50%; background:#262B26; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h13" },
                            h("span", { style: sty(`font-size:16px;`), className: "msym" },
                              "fiber_manual_record"
                            )
                          ),
                          h("button", { onClick: fn($c.kill), title: `Hangup`, style: sty(`width:28px; height:28px; border-radius:50%; background:#262B26; border:0; color:#FFB4AB; cursor:pointer;`), className: "k-h5" },
                            h("span", { style: sty(`font-size:16px;`), className: "msym" },
                              "call_end"
                            )
                          )
                        )
                      ))),
                    (v.noLiveCalls ? h("div", { style: sty(`font-size:12px; color:#9AA39B; line-height:1.5; padding:6px 2px;`) },
                        "No calls are up right now. Any channel the system reports appears here within a second, with its peer, its duration and controls to listen, record or hang it up."
                      ) : null)
                  )
                ),
                h("div", { style: sty(`display:flex; flex-direction:column; gap:12px;`) },
                  h("div", { style: sty(`background:#1B211C; border-radius:16px; padding:16px 18px;`) },
                    h("div", { style: sty(`font-size:15px; font-weight:500; margin-bottom:12px;`) },
                      "System health"
                    ),
                    h("div", { style: sty(`display:flex; flex-direction:column; gap:11px;`) },
                      A(v.health).map(($h, $h$i) => R($h$i, h("div", null,
                          h("div", { style: sty(`display:flex; justify-content:space-between; font-size:12px; color:#C4CBC2; margin-bottom:5px;`) },
                            h("span", null,
                              S($h.label)
                            ),
                            h("span", { style: sty(`font-family:'Roboto Mono',monospace; color:#9AA39B;`) },
                              S($h.value)
                            )
                          ),
                          h("div", { style: sty(`height:6px; border-radius:3px; background:#262B26; overflow:hidden;`) },
                            h("div", { style: sty(`height:100%; border-radius:3px; background:#82D9A5; width:${S($h.pct)};`) })
                          )
                        ))),
                      (v.noHealth ? h("div", { style: sty(`font-size:12px; color:#9AA39B; line-height:1.5;`) },
                          "Nothing to measure yet. These bars come from the endpoints and queues the running system reports, and it currently reports none of either."
                        ) : null)
                    )
                  ),
                  h("div", { style: sty(`background:#1B211C; border-radius:16px; padding:16px 18px; flex:1;`) },
                    h("div", { style: sty(`font-size:15px; font-weight:500; margin-bottom:10px;`) },
                      "Quick actions"
                    ),
                    h("div", { style: sty(`display:flex; flex-wrap:wrap; gap:8px;`) },
                      A(v.quickActions).map(($q, $q$i) => R($q$i, h("button", { onClick: fn($q.run), style: sty(`display:flex; align-items:center; gap:6px; background:#262B26; border:0; border-radius:999px; padding:8px 14px 8px 11px; color:#C4CBC2; font:inherit; font-size:12.5px; cursor:pointer;`), className: "k-h13" },
                          h("span", { style: sty(`font-size:17px;`), className: "msym" },
                            S($q.icon)
                          ),
                          S($q.label)
                        )))
                    )
                  )
                )
              )
            ) : null),
            (v.isCustomise ? h("div", { style: sty(`border-radius:26px; padding:22px 26px; margin-bottom:12px; background:linear-gradient(115deg,#0F3D28,#1B4D33,#0F3D28); background-size:200% 100%; animation:m3Sweep 11s linear infinite;`) },
                h("div", { style: sty(`display:flex; align-items:center; gap:18px; flex-wrap:wrap;`) },
                  h("button", { onClick: fn(v.toggleFun), style: sty(`display:flex; align-items:center; gap:14px; background:${S(v.funBtnBg)}; border:0; border-radius:999px; padding:8px 8px 8px 8px; cursor:pointer;`) },
                    h("span", { style: sty(`width:64px; height:64px; border-radius:50%; background:${S(v.funKnobBg)}; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(0,0,0,.4);`) },
                      h("span", { style: sty(`font-size:34px; color:${S(v.funKnobFg)}; animation:${S(v.funKnobAnim)};`), className: "msym" },
                        S(v.funIcon)
                      )
                    ),
                    h("span", { style: sty(`font-size:22px; font-weight:700; color:${S(v.funLabelFg)}; padding-right:18px;`) },
                      S(v.funLabel)
                    )
                  ),
                  h("div", { style: sty(`flex:1; min-width:280px;`) },
                    h("div", { style: sty(`font-size:22px; font-weight:500; color:#DFF3E5;`) },
                      `Fun level ${S(v.funLevel)} · ${S(v.funName)}`
                    ),
                    h("div", { style: sty(`font-size:13px; color:#C3EFD5; margin-top:6px; line-height:1.55; max-width:70ch;`) },
                      S(v.funBlurb)
                    )
                  )
                ),
                h("div", { style: sty(`display:flex; gap:8px; margin-top:18px; flex-wrap:wrap;`) },
                  A(v.funLevels).map(($l, $l$i) => R($l$i, F(
                    ($l.on ? h("button", { onClick: fn($l.pick), style: sty(`flex:1; min-width:150px; text-align:left; background:#9FF7C4; border:0; border-radius:16px; padding:13px 15px; cursor:pointer; animation:m3Bounce .34s cubic-bezier(.2,1.4,.4,1);`) },
                        h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:24px; font-weight:700; color:#00391F;`) },
                          S($l.num)
                        ),
                        h("div", { style: sty(`font-size:13px; font-weight:600; color:#00391F; margin-top:2px;`) },
                          S($l.name)
                        ),
                        h("div", { style: sty(`font-size:11.5px; color:#1B4D33; margin-top:4px; line-height:1.45;`) },
                          S($l.desc)
                        )
                      ) : null),
                    ($l.off ? h("button", { onClick: fn($l.pick), style: sty(`flex:1; min-width:150px; text-align:left; background:rgba(0,0,0,.24); border:1px solid rgba(159,247,196,.3); border-radius:16px; padding:13px 15px; cursor:pointer;`), className: "k-h14" },
                        h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:24px; font-weight:700; color:#9FF7C4;`) },
                          S($l.num)
                        ),
                        h("div", { style: sty(`font-size:13px; font-weight:600; color:#DFF3E5; margin-top:2px;`) },
                          S($l.name)
                        ),
                        h("div", { style: sty(`font-size:11.5px; color:#9FF7C4; margin-top:4px; line-height:1.45;`) },
                          S($l.desc)
                        )
                      ) : null)
                  )))
                ),
                h("div", { style: sty(`display:flex; gap:10px; margin-top:18px; flex-wrap:wrap; align-items:center;`) },
                  h("button", { onClick: fn(v.toggleRandom), style: sty(`display:flex; align-items:center; gap:11px; background:${S(v.rndBtnBg)}; border:2px solid ${S(v.rndBtnBorder)}; border-radius:999px; padding:11px 22px 11px 14px; cursor:pointer;`) },
                    h("span", { style: sty(`width:44px; height:26px; border-radius:14px; background:${S(v.rndTrack)}; display:flex; align-items:center; justify-content:${S(v.rndJustify)}; padding:0 4px;`) },
                      h("span", { style: sty(`width:18px; height:18px; border-radius:50%; background:${S(v.rndKnob)};`) })
                    ),
                    h("span", { style: sty(`font-size:14px; font-weight:600; color:${S(v.rndFg)};`) },
                      "Random appearance for every element"
                    )
                  ),
                  h("button", { onClick: fn(v.rerollNow), style: sty(`display:flex; align-items:center; gap:7px; background:rgba(0,0,0,.24); border:1px solid rgba(159,247,196,.3); border-radius:999px; padding:11px 20px 11px 15px; color:#9FF7C4; font:inherit; font-size:13px; font-weight:500; cursor:pointer;`), className: "k-h14" },
                    h("span", { style: sty(`font-size:18px;`), className: "msym" },
                      "casino"
                    ),
                    "Reroll everything now"
                  ),
                  h("button", { onClick: fn(v.maxFun), style: sty(`display:flex; align-items:center; gap:7px; background:#9FF7C4; border:0; border-radius:999px; padding:12px 22px 12px 16px; color:#00391F; font:inherit; font-size:13.5px; font-weight:700; cursor:pointer; animation:m3Glow 2.4s ease-in-out infinite;`) },
                    h("span", { style: sty(`font-size:19px;`), className: "msym" },
                      "rocket_launch"
                    ),
                    "Maximum fun"
                  ),
                  h("button", { onClick: fn(v.zeroFun), style: sty(`background:transparent; border:0; color:#9FF7C4; font:inherit; font-size:12.5px; cursor:pointer; padding:11px 14px;`) },
                    "All business, please"
                  )
                )
              ) : null),
            (v.isHistory ? F(
              h("div", { style: sty(`display:flex; align-items:center; gap:8px; margin-bottom:12px; flex-wrap:wrap;`) },
                h("div", { style: sty(`display:flex; align-items:center; gap:8px; background:#1B211C; border-radius:999px; padding:7px 14px;`) },
                  h("span", { style: sty(`font-size:17px; color:#82D9A5;`), className: "msym" },
                    "account_tree"
                  ),
                  h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12.5px; color:#DFE4DC;`) },
                    S(v.branchName)
                  )
                ),
                A(v.branches).map(($b, $b$i) => R($b$i, F(
                  ($b.on ? h("button", { onClick: fn($b.pick), style: sty(`background:#005230; border:0; border-radius:999px; padding:7px 14px; color:#9FF7C4; font-family:'Roboto Mono',monospace; font-size:12px; font-weight:500; cursor:pointer;`) },
                      S($b.label)
                    ) : null),
                  ($b.off ? h("button", { onClick: fn($b.pick), style: sty(`background:transparent; border:1px solid #414942; border-radius:999px; padding:7px 14px; color:#C4CBC2; font-family:'Roboto Mono',monospace; font-size:12px; cursor:pointer;`), className: "k-h1" },
                      S($b.label)
                    ) : null)
                ))),
                h("div", { style: sty(`flex:1;`) }),
                A(v.histActions).map(($a, $a$i) => R($a$i, h("button", { onClick: fn($a.run), title: $a.hint, style: sty(`display:flex; align-items:center; gap:6px; background:#1B211C; border:0; border-radius:999px; padding:8px 14px 8px 11px; color:${S($a.fg)}; font:inherit; font-size:12.5px; cursor:pointer;`), className: "k-h13" },
                    h("span", { style: sty(`font-size:16px;`), className: "msym" },
                      S($a.icon)
                    ),
                    S($a.label)
                  )))
              ),
              h("div", { style: sty(`display:grid; grid-template-columns:1fr 420px; gap:12px; margin-bottom:12px;`) },
                h("div", { style: sty(`background:#1B211C; border-radius:16px; overflow:hidden;`) },
                  h("div", { style: sty(`display:flex; align-items:center; gap:8px; padding:12px 16px;`) },
                    h("span", { style: sty(`font-size:15px; font-weight:500;`) },
                      "Commits"
                    ),
                    h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11.5px; color:#8FA394;`) },
                      S(v.commitCount)
                    ),
                    h("div", { style: sty(`flex:1;`) }),
                    A(v.histFilters).map(($f, $f$i) => R($f$i, F(
                      ($f.on ? h("button", { onClick: fn($f.pick), style: sty(`background:#005230; border:0; border-radius:8px; padding:5px 11px; color:#9FF7C4; font:inherit; font-size:11.5px; font-weight:500; cursor:pointer;`) },
                          S($f.label)
                        ) : null),
                      ($f.off ? h("button", { onClick: fn($f.pick), style: sty(`background:transparent; border:1px solid #414942; border-radius:8px; padding:5px 11px; color:#9AA39B; font:inherit; font-size:11.5px; cursor:pointer;`), className: "k-h15" },
                          S($f.label)
                        ) : null)
                    )))
                  ),
                  h("div", { style: sty(`max-height:460px; overflow-y:auto;`) },
                    A(v.commitRows).map(($c, $c$i) => R($c$i, h("div", { onClick: fn($c.pick), onContextMenu: fn($c.ctx), style: sty(`display:flex; align-items:flex-start; gap:12px; padding:11px 16px; border-top:1px solid #262B26; cursor:pointer; background:${S($c.bg)}; animation:m3Slide .28s cubic-bezier(.2,0,0,1) both;`), className: "k-h16" },
                        h("div", { style: sty(`display:flex; flex-direction:column; align-items:center; padding-top:3px; flex:0 0 auto;`) },
                          h("span", { style: sty(`width:11px; height:11px; border-radius:50%; background:${S($c.dot)}; border:2px solid #0F1510;`) }),
                          h("span", { style: sty(`width:2px; flex:1; min-height:22px; background:#333B34;`) })
                        ),
                        h("div", { style: sty(`flex:1; min-width:0;`) },
                          h("div", { style: sty(`display:flex; align-items:center; gap:8px; flex-wrap:wrap;`) },
                            h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12px; color:#82D9A5;`) },
                              S($c.sha)
                            ),
                            h("span", { style: sty(`font-size:12.5px; color:#DFE4DC;`) },
                              S($c.msg)
                            ),
                            ($c.hasTag ? h("span", { style: sty(`background:#1B4D33; color:#9FF7C4; border-radius:6px; padding:1px 8px; font-family:'Roboto Mono',monospace; font-size:10.5px;`) },
                                S($c.tag)
                              ) : null)
                          ),
                          h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#8FA394; margin-top:3px;`) },
                            S($c.meta)
                          )
                        ),
                        h("button", { onClick: fn($c.compare), title: `Add to comparison`, style: sty(`width:26px; height:26px; border-radius:50%; background:transparent; border:1px solid #414942; color:${S($c.cmpFg)}; cursor:pointer; flex:0 0 auto;`), className: "k-h17" },
                          h("span", { style: sty(`font-size:15px;`), className: "msym" },
                            "compare_arrows"
                          )
                        )
                      )))
                  )
                ),
                h("div", { style: sty(`display:flex; flex-direction:column; gap:12px;`) },
                  h("div", { style: sty(`background:#1B211C; border-radius:16px; padding:16px 18px;`) },
                    h("div", { style: sty(`font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#8FA394;`) },
                      "Diff"
                    ),
                    h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12px; color:#9FF7C4; margin:8px 0 12px;`) },
                      S(v.diffFile)
                    ),
                    h("div", { style: sty(`background:#0C110D; border-radius:12px; padding:12px; font-family:'Roboto Mono',monospace; font-size:12.5px; line-height:1.7;`) },
                      A(v.diffLines).map(($d, $d$i) => R($d$i, h("div", { style: sty(`color:${S($d.color)}; background:${S($d.bg)}; padding:1px 6px; border-radius:4px; white-space:pre-wrap;`) },
                          S($d.text)
                        )))
                    ),
                    h("div", { style: sty(`display:flex; gap:8px; margin-top:14px; flex-wrap:wrap;`) },
                      A(v.diffActions).map(($a, $a$i) => R($a$i, h("button", { onClick: fn($a.run), title: $a.hint, style: sty(`display:flex; align-items:center; gap:6px; background:${S($a.bg)}; border:0; border-radius:999px; padding:9px 15px 9px 12px; color:${S($a.fg)}; font:inherit; font-size:12.5px; font-weight:500; cursor:pointer;`) },
                          h("span", { style: sty(`font-size:16px;`), className: "msym" },
                            S($a.icon)
                          ),
                          S($a.label)
                        )))
                    )
                  ),
                  h("div", { style: sty(`background:#1B211C; border-radius:16px; padding:16px 18px;`) },
                    h("div", { style: sty(`font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#8FA394; margin-bottom:10px;`) },
                      "Blame — who last touched what"
                    ),
                    A(v.blameRows).map(($b, $b$i) => R($b$i, h("div", { style: sty(`display:flex; align-items:center; gap:10px; padding:6px 0;`) },
                        h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#82D9A5; flex:0 0 auto;`) },
                          S($b.sha)
                        ),
                        h("span", { style: sty(`flex:1; font-size:12px; color:#C4CBC2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                          S($b.what)
                        ),
                        h("span", { style: sty(`font-size:11px; color:#8FA394;`) },
                          S($b.who)
                        )
                      )))
                  ),
                  h("div", { style: sty(`background:#1B211C; border-radius:16px; padding:16px 18px;`) },
                    h("div", { style: sty(`font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#8FA394; margin-bottom:10px;`) },
                      "Comparison"
                    ),
                    h("div", { style: sty(`font-size:12.5px; color:#C4CBC2; line-height:1.6;`) },
                      S(v.compareLabel)
                    )
                  )
                )
              )
            ) : null),
            (v.isTrunkAuth ? F(
              h("div", { style: sty(`display:flex; flex-direction:column; gap:10px; margin-bottom:12px;`) },
                A(v.authRequests).map(($a, $a$i) => R($a$i, h("div", { style: sty(`background:#1B211C; border-radius:18px; padding:18px 20px; animation:m3Rise .38s cubic-bezier(.2,1.1,.35,1) both;`) },
                    h("div", { style: sty(`display:flex; align-items:flex-start; gap:14px;`) },
                      h("span", { style: sty(`font-size:24px; color:${S($a.iconColor)}; flex:0 0 auto;`), className: "msym" },
                        S($a.icon)
                      ),
                      h("div", { style: sty(`flex:1; min-width:0;`) },
                        h("div", { style: sty(`display:flex; align-items:center; gap:9px; flex-wrap:wrap;`) },
                          h("span", { style: sty(`font-size:15.5px; font-weight:500;`) },
                            S($a.title)
                          ),
                          h("span", { style: sty(`background:${S($a.riskBg)}; color:${S($a.riskFg)}; border-radius:8px; padding:2px 9px; font-size:11px; font-weight:500;`) },
                            S($a.risk)
                          ),
                          h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#778078;`) },
                            S($a.when)
                          )
                        ),
                        h("div", { style: sty(`font-size:12.5px; color:#9AA39B; margin-top:6px; line-height:1.6; max-width:82ch;`) },
                          S($a.body)
                        ),
                        h("div", { style: sty(`display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-top:12px;`) },
                          A($a.facts).map(($f, $f$i) => R($f$i, h("div", { style: sty(`background:#141A15; border-radius:10px; padding:9px 12px;`) },
                              h("div", { style: sty(`font-size:10.5px; letter-spacing:.7px; text-transform:uppercase; color:#8FA394;`) },
                                S($f.k)
                              ),
                              h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12.5px; color:#C4CBC2; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                                S($f.v)
                              )
                            )))
                        ),
                        h("div", { style: sty(`display:flex; align-items:center; gap:8px; margin-top:14px; flex-wrap:wrap;`) },
                          h("button", { onClick: fn($a.yes), style: sty(`display:flex; align-items:center; gap:7px; background:#82D9A5; border:0; border-radius:999px; padding:10px 22px 10px 16px; color:#00391F; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`), className: "k-h12" },
                            h("span", { style: sty(`font-size:18px;`), className: "msym" },
                              "thumb_up"
                            ),
                            "Send YES"
                          ),
                          h("button", { onClick: fn($a.no), style: sty(`display:flex; align-items:center; gap:7px; background:#93000A; border:0; border-radius:999px; padding:10px 22px 10px 16px; color:#fff; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`), className: "k-h18" },
                            h("span", { style: sty(`font-size:18px;`), className: "msym" },
                              "thumb_down"
                            ),
                            "Send NO"
                          ),
                          h("button", { onClick: fn($a.ask), title: $a.askHint, style: sty(`background:transparent; border:1px solid #414942; border-radius:999px; padding:10px 18px; color:#C4CBC2; font:inherit; font-size:13px; cursor:pointer;`), className: "k-h1" },
                            "Ask for detail"
                          ),
                          h("button", { onClick: fn($a.defer), style: sty(`background:transparent; border:0; color:#9AA39B; font:inherit; font-size:12.5px; cursor:pointer; padding:10px 12px;`) },
                            "Defer"
                          ),
                          h("div", { style: sty(`flex:1;`) }),
                          h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11.5px; color:${S($a.stateFg)};`) },
                            S($a.state)
                          )
                        )
                      )
                    )
                  )))
              ),
              h("div", { style: sty(`background:#1B211C; border-radius:18px; padding:16px 20px; margin-bottom:12px;`) },
                h("div", { style: sty(`display:flex; align-items:center; gap:10px; margin-bottom:12px;`) },
                  h("span", { style: sty(`font-size:15px; font-weight:500;`) },
                    "Answer history"
                  ),
                  h("div", { style: sty(`flex:1;`) }),
                  h("button", { onClick: fn(v.newAuthRequest), style: sty(`display:flex; align-items:center; gap:6px; background:#1B4D33; border:0; border-radius:999px; padding:9px 16px 9px 12px; color:#9FF7C4; font:inherit; font-size:12.5px; font-weight:500; cursor:pointer;`), className: "k-h3" },
                    h("span", { style: sty(`font-size:17px;`), className: "msym" },
                      "send"
                    ),
                    "Ask a partner something"
                  )
                ),
                A(v.authHistory).map(($h, $h$i) => R($h$i, h("div", { style: sty(`display:grid; grid-template-columns:1fr 2fr 90px 110px; gap:12px; padding:10px 0; border-top:1px solid #262B26; align-items:center;`) },
                    h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12px; color:#82D9A5;`) },
                      S($h.partner)
                    ),
                    h("span", { style: sty(`font-size:12.5px; color:#C4CBC2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                      S($h.what)
                    ),
                    h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11.5px; color:${S($h.color)};`) },
                      S($h.answer)
                    ),
                    h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#778078; text-align:right;`) },
                      S($h.when)
                    )
                  )))
              )
            ) : null),
            (v.isArcade ? F(
              h("div", { style: sty(`display:grid; grid-template-columns:290px 1fr; gap:12px; margin-bottom:12px;`) },
                h("div", { style: sty(`background:linear-gradient(150deg,#0F3D28,#1B4D33); border-radius:20px; padding:22px; display:flex; flex-direction:column; align-items:center; text-align:center;`) },
                  h("span", { style: sty(`font-size:30px; color:#9FF7C4;`), className: "msym" },
                    "confirmation_number"
                  ),
                  h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:54px; font-weight:500; color:#DFF3E5; line-height:1.05; margin-top:6px;`) },
                    S(v.credits)
                  ),
                  h("div", { style: sty(`font-size:12.5px; color:#9FF7C4;`) },
                    "confirmation credits"
                  ),
                  h("div", { style: sty(`font-size:12px; color:#C3EFD5; margin-top:14px; line-height:1.6;`) },
                    "One credit skips one ceremony. Actions above the danger line still cost all four gates, because some mistakes deserve friction."
                  ),
                  h("button", { onClick: fn(v.spendCredit), style: sty(`margin-top:16px; width:100%; background:#9FF7C4; border:0; border-radius:999px; padding:11px 0; color:#00391F; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`), className: "k-h19" },
                    "Spend one now"
                  )
                ),
                h("div", { style: sty(`background:#1B211C; border-radius:20px; padding:18px 20px;`) },
                  h("div", { style: sty(`display:flex; align-items:center; gap:10px;`) },
                    h("span", { style: sty(`font-size:15px; font-weight:500;`) },
                      S(v.gameTitle)
                    ),
                    h("div", { style: sty(`flex:1;`) }),
                    h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:20px; color:#82D9A5;`) },
                      S(v.gameScore)
                    ),
                    h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:13px; color:#FFB4AB;`) },
                      S(v.gameClock)
                    )
                  ),
                  h("div", { style: sty(`font-size:12.5px; color:#9AA39B; line-height:1.55; margin:6px 0 14px;`) },
                    S(v.gameBlurb)
                  ),
                  (v.gWhack ? h("div", { style: sty(`display:grid; grid-template-columns:repeat(5,1fr); gap:8px;`) },
                      A(v.gameCells).map(($g, $g$i) => R($g$i, F(
                        ($g.up ? h("button", { onClick: fn($g.hit), style: sty(`height:58px; border-radius:14px; background:#005230; border:2px solid #82D9A5; cursor:pointer; display:flex; align-items:center; justify-content:center; animation:m3Pop .12s ease-out;`) },
                            h("span", { style: sty(`font-size:25px; color:#9FF7C4;`), className: "msym" },
                              S($g.icon)
                            )
                          ) : null),
                        ($g.down ? h("button", { onClick: fn($g.miss), style: sty(`height:58px; border-radius:14px; background:#141A15; border:2px solid #262B26; cursor:pointer;`), className: "k-h20" }) : null)
                      )))
                    ) : null),
                  (v.gDtmf ? F(
                    h("div", { style: sty(`background:#0C110D; border-radius:14px; padding:14px; margin-bottom:10px; text-align:center;`) },
                      h("div", { style: sty(`font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#8FA394;`) },
                        S(v.dtmfPhase)
                      ),
                      h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:32px; letter-spacing:10px; color:#9FF7C4; margin-top:8px; min-height:40px;`) },
                        S(v.dtmfShown)
                      )
                    ),
                    h("div", { style: sty(`display:grid; grid-template-columns:repeat(3,1fr); gap:7px;`) },
                      A(v.dtmfKeys).map(($k, $k$i) => R($k$i, h("button", { onClick: fn($k.press), style: sty(`height:50px; border-radius:12px; background:linear-gradient(#20281F,#171D18); border:1px solid #414942; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:20px; cursor:pointer; box-shadow:0 2px 0 #0C110D;`), className: "k-h21" },
                          S($k.label)
                        )))
                    )
                  ) : null),
                  (v.gSort ? F(
                    h("div", { style: sty(`font-size:12px; color:#8FA394; margin-bottom:8px;`) },
                      S(v.sortHint)
                    ),
                    h("div", { style: sty(`display:flex; flex-direction:column; gap:6px;`) },
                      A(v.sortItems).map(($i, $i$i) => R($i$i, h("div", { style: sty(`display:flex; align-items:center; gap:10px; background:${S($i.bg)}; border-radius:12px; padding:10px 12px;`) },
                          h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12px; color:#778078;`) },
                            S($i.pos)
                          ),
                          h("span", { style: sty(`flex:1; font-family:'Roboto Mono',monospace; font-size:13px; color:#DFE4DC;`) },
                            S($i.label)
                          ),
                          h("button", { onClick: fn($i.up), style: sty(`width:28px; height:28px; border-radius:50%; background:#262B26; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h13" },
                            h("span", { style: sty(`font-size:16px;`), className: "msym" },
                              "arrow_upward"
                            )
                          ),
                          h("button", { onClick: fn($i.down), style: sty(`width:28px; height:28px; border-radius:50%; background:#262B26; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h13" },
                            h("span", { style: sty(`font-size:16px;`), className: "msym" },
                              "arrow_downward"
                            )
                          )
                        )))
                    ),
                    h("button", { onClick: fn(v.sortCheck), style: sty(`margin-top:10px; background:#262B26; border:0; border-radius:999px; padding:9px 18px; color:#9FF7C4; font:inherit; font-size:12.5px; font-weight:500; cursor:pointer;`) },
                      "Check my order"
                    )
                  ) : null),
                  (v.gMatch ? h("div", { style: sty(`display:grid; grid-template-columns:repeat(3,1fr); gap:8px;`) },
                      A(v.matchTiles).map(($t, $t$i) => R($t$i, h("button", { onClick: fn($t.pick), style: sty(`min-height:62px; border-radius:12px; background:${S($t.bg)}; border:2px solid ${S($t.border)}; color:${S($t.fg)}; font:inherit; font-size:11.5px; line-height:1.4; padding:9px; cursor:pointer; text-align:left;`) },
                          S($t.label)
                        )))
                    ) : null),
                  (v.gSpot ? h("div", { style: sty(`background:#0C110D; border-radius:14px; padding:14px; display:flex; flex-direction:column; gap:4px;`) },
                      A(v.spotLines).map(($l, $l$i) => R($l$i, h("button", { onClick: fn($l.pick), style: sty(`text-align:left; background:${S($l.bg)}; border:0; border-radius:8px; padding:7px 10px; color:${S($l.fg)}; font-family:'Roboto Mono',monospace; font-size:12.5px; cursor:pointer;`), className: "k-h22" },
                          S($l.text)
                        )))
                    ) : null),
                  (v.gReflex ? h("div", { style: sty(`text-align:center; padding:10px 0;`) },
                      h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:44px; color:#9FF7C4; letter-spacing:6px;`) },
                        S(v.reflexTarget)
                      ),
                      h("div", { style: sty(`font-size:12px; color:#8FA394; margin:8px 0 14px;`) },
                        S(v.reflexHint)
                      ),
                      h("div", { style: sty(`display:grid; grid-template-columns:repeat(5,1fr); gap:7px;`) },
                        A(v.reflexKeys).map(($k, $k$i) => R($k$i, h("button", { onClick: fn($k.press), style: sty(`height:50px; border-radius:12px; background:#1B211C; border:1px solid #414942; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:15px; cursor:pointer;`), className: "k-h13" },
                            S($k.label)
                          )))
                      )
                    ) : null),
                  h("div", { style: sty(`display:flex; gap:8px; margin-top:14px;`) },
                    h("button", { onClick: fn(v.startGame), style: sty(`background:#82D9A5; border:0; border-radius:999px; padding:10px 22px; color:#00391F; font:inherit; font-size:13px; font-weight:500; cursor:pointer;`) },
                      S(v.gameButton)
                    ),
                    h("button", { onClick: fn(v.stopGame), style: sty(`background:transparent; border:1px solid #414942; border-radius:999px; padding:10px 18px; color:#C4CBC2; font:inherit; font-size:13px; cursor:pointer;`) },
                      "Stop"
                    )
                  )
                )
              ),
              h("div", { style: sty(`display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:12px;`) },
                A(v.games).map(($g, $g$i) => R($g$i, F(
                  ($g.on ? h("button", { onClick: fn($g.pick), style: sty(`text-align:left; background:#005230; border:2px solid #82D9A5; border-radius:16px; padding:14px 16px; cursor:pointer; display:flex; flex-direction:column; gap:6px;`) },
                      h("span", { style: sty(`font-size:22px; color:#9FF7C4; animation:m3Bounce .4s cubic-bezier(.2,1.4,.4,1);`), className: "msym" },
                        S($g.icon)
                      ),
                      h("span", { style: sty(`font-size:13.5px; font-weight:500; color:#DFF3E5;`) },
                        S($g.name)
                      ),
                      h("span", { style: sty(`font-size:11.5px; color:#C3EFD5; line-height:1.5;`) },
                        S($g.blurb)
                      ),
                      h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#9FF7C4;`) },
                        S($g.reward)
                      )
                    ) : null),
                  ($g.off ? h("button", { onClick: fn($g.pick), style: sty(`text-align:left; background:#1B211C; border:2px solid transparent; border-radius:16px; padding:14px 16px; cursor:pointer; display:flex; flex-direction:column; gap:6px;`), className: "k-h23" },
                      h("span", { style: sty(`font-size:22px; color:#82D9A5;`), className: "msym" },
                        S($g.icon)
                      ),
                      h("span", { style: sty(`font-size:13.5px; font-weight:500; color:#DFE4DC;`) },
                        S($g.name)
                      ),
                      h("span", { style: sty(`font-size:11.5px; color:#9AA39B; line-height:1.5;`) },
                        S($g.blurb)
                      ),
                      h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#82D9A5;`) },
                        S($g.reward)
                      )
                    ) : null)
                )))
              )
            ) : null),
            (v.isServers ? F(
              h("div", { style: sty(`border-radius:24px; padding:26px 28px; margin-bottom:14px; background:linear-gradient(110deg,#0F3D28,#1B4D33,#0F3D28); background-size:200% 100%; animation:m3Sweep 9s linear infinite;`) },
                h("div", { style: sty(`display:flex; align-items:center; gap:14px;`) },
                  h("span", { style: sty(`font-size:32px; color:#9FF7C4; animation:m3Wiggle 2.6s ease-in-out infinite;`), className: "msym" },
                    "bolt"
                  ),
                  h("div", { style: sty(`flex:1;`) },
                    h("div", { style: sty(`font-size:24px; font-weight:500; color:#DFF3E5;`) },
                      "One Click Setup Server"
                    ),
                    h("div", { style: sty(`font-size:13.5px; color:#9FF7C4; margin-top:5px; line-height:1.55; max-width:74ch;`) },
                      S(v.oneClickPitch)
                    )
                  ),
                  h("button", { onClick: fn(v.runOneClick), style: sty(`background:#9FF7C4; border:0; border-radius:999px; padding:16px 32px 16px 26px; color:#00391F; font:inherit; font-size:15px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:9px; animation:m3Glow 2.2s ease-in-out infinite; flex:0 0 auto;`), className: "k-h19" },
                    h("span", { style: sty(`font-size:22px;`), className: "msym" },
                      "rocket_launch"
                    ),
                    S(v.oneClickButton)
                  )
                ),
                h("div", { style: sty(`display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px 20px; margin-top:18px; background:rgba(0,0,0,.22); border-radius:16px; padding:16px 18px;`) },
                  A(v.basicCtls).map(($c, $c$i) => R($c$i, h(M3Control, { ctl: $c })))
                ),
                h("div", { style: sty(`display:flex; gap:8px; margin-top:16px; flex-wrap:wrap;`) },
                  A(v.oneClickModes).map(($m, $m$i) => R($m$i, F(
                    ($m.on ? h("button", { onClick: fn($m.pick), style: sty(`display:flex; align-items:center; gap:6px; background:#9FF7C4; border:0; border-radius:999px; padding:7px 15px; color:#00391F; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`) },
                        h("span", { style: sty(`font-size:16px;`), className: "msym" },
                          "check"
                        ),
                        S($m.label)
                      ) : null),
                    ($m.off ? h("button", { onClick: fn($m.pick), style: sty(`background:rgba(0,0,0,.22); border:1px solid rgba(159,247,196,.4); border-radius:999px; padding:7px 15px; color:#9FF7C4; font:inherit; font-size:12.5px; cursor:pointer;`), className: "k-h24" },
                        S($m.label)
                      ) : null)
                  )))
                )
              ),
              (v.oneClickRunning ? h("div", { style: sty(`background:#1B211C; border-radius:16px; padding:18px 20px; margin-bottom:14px;`) },
                  h("div", { style: sty(`display:flex; align-items:center; gap:10px; margin-bottom:12px;`) },
                    h("span", { style: sty(`font-size:20px; color:#82D9A5; animation:m3Spin 1.4s linear infinite;`), className: "msym" },
                      "progress_activity"
                    ),
                    h("span", { style: sty(`font-size:15px; font-weight:500;`) },
                      S(v.oneClickStage)
                    ),
                    h("div", { style: sty(`flex:1;`) }),
                    h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12px; color:#82D9A5;`) },
                      S(v.oneClickPct)
                    )
                  ),
                  h("div", { style: sty(`height:8px; border-radius:4px; background:#262B26; overflow:hidden; margin-bottom:14px;`) },
                    h("div", { style: sty(`height:100%; background:#82D9A5; border-radius:4px; width:${S(v.oneClickPct)}; transition:width .4s ease;`) })
                  ),
                  h("div", { style: sty(`display:flex; flex-direction:column; gap:7px;`) },
                    A(v.oneClickLog).map(($l, $l$i) => R($l$i, h("div", { style: sty(`display:flex; align-items:center; gap:9px; font-size:12.5px; color:${S($l.color)}; animation:m3Slide .3s cubic-bezier(.2,0,0,1) both;`) },
                        h("span", { style: sty(`font-size:16px;`), className: "msym" },
                          S($l.icon)
                        ),
                        h("span", { style: sty(`flex:1;`) },
                          S($l.text)
                        ),
                        h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#778078;`) },
                          S($l.ms)
                        )
                      )))
                  )
                ) : null)
            ) : null),
            (v.isCanvas ? h("div", { style: sty(`background:#141A15; border-radius:16px; padding:10px; display:flex; flex-direction:column; gap:10px; height:100%; min-height:560px; position:${S(v.canvasPosition)}; inset:${S(v.canvasInset)}; z-index:${S(v.canvasZ)};`) },
                h("div", { style: sty(`display:flex; align-items:center; gap:8px; flex-wrap:wrap;`) },
                  A(v.canvasTools).map(($t, $t$i) => R($t$i, F(
                    ($t.on ? h("button", { onClick: fn($t.pick), style: sty(`display:flex; align-items:center; gap:6px; background:#005230; border:0; border-radius:999px; padding:8px 14px 8px 11px; color:#9FF7C4; font:inherit; font-size:12.5px; font-weight:500; cursor:pointer;`) },
                        h("span", { style: sty(`font-size:17px;`), className: "msym" },
                          S($t.icon)
                        ),
                        S($t.label)
                      ) : null),
                    ($t.off ? h("button", { onClick: fn($t.pick), style: sty(`display:flex; align-items:center; gap:6px; background:transparent; border:1px solid #414942; border-radius:999px; padding:8px 14px 8px 11px; color:#C4CBC2; font:inherit; font-size:12.5px; cursor:pointer;`), className: "k-h10" },
                        h("span", { style: sty(`font-size:17px;`), className: "msym" },
                          S($t.icon)
                        ),
                        S($t.label)
                      ) : null)
                  ))),
                  h("div", { style: sty(`flex:1;`) }),
                  A(v.canvasToggles).map(($t, $t$i) => R($t$i, F(
                    ($t.on ? h("button", { onClick: fn($t.pick), title: $t.label, style: sty(`width:32px; height:32px; border-radius:9px; background:#005230; border:0; color:#9FF7C4; cursor:pointer;`) },
                        h("span", { style: sty(`font-size:17px;`), className: "msym" },
                          S($t.icon)
                        )
                      ) : null),
                    ($t.off ? h("button", { onClick: fn($t.pick), title: $t.label, style: sty(`width:32px; height:32px; border-radius:9px; background:transparent; border:1px solid #414942; color:#9AA39B; cursor:pointer;`), className: "k-h15" },
                        h("span", { style: sty(`font-size:17px;`), className: "msym" },
                          S($t.icon)
                        )
                      ) : null)
                  ))),
                  h("button", { onClick: fn(v.toggleFullscreen), title: `Full-screen editor`, style: sty(`width:32px; height:32px; border-radius:9px; background:#1B4D33; border:0; color:#9FF7C4; cursor:pointer;`) },
                    h("span", { style: sty(`font-size:17px;`), className: "msym" },
                      S(v.fsIcon)
                    )
                  ),
                  h("div", { style: sty(`display:flex; align-items:center; gap:6px; background:#1B211C; border-radius:999px; padding:4px 6px;`) },
                    h("button", { onClick: fn(v.zoomOut), style: sty(`width:28px; height:28px; border-radius:50%; background:transparent; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h1" },
                      h("span", { style: sty(`font-size:17px;`), className: "msym" },
                        "remove"
                      )
                    ),
                    h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12px; color:#9AA39B; min-width:46px; text-align:center;`) },
                      S(v.zoomLabel)
                    ),
                    h("button", { onClick: fn(v.zoomIn), style: sty(`width:28px; height:28px; border-radius:50%; background:transparent; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h1" },
                      h("span", { style: sty(`font-size:17px;`), className: "msym" },
                        "add"
                      )
                    )
                  )
                ),
                h("div", { style: sty(`flex:1; display:grid; grid-template-columns:1fr 300px; gap:10px; min-height:0;`) },
                  h("div", { onClick: fn(v.canvasBgClick), onDragOver: fn(v.canvasDragOver), onDrop: fn(v.canvasDrop), style: sty(`position:relative; border-radius:12px; background-color:#0C110D; background-image:radial-gradient(#222A23 1px, transparent 1px); background-size:22px 22px; overflow:hidden;`) },
                    h("div", { style: sty(`position:absolute; left:10px; top:10px; z-index:3; display:flex; gap:5px; background:rgba(20,26,21,.9); border-radius:999px; padding:4px;`) },
                      A(v.canvasLayers).map(($l, $l$i) => R($l$i, F(
                        ($l.on ? h("button", { onClick: fn($l.pick), style: sty(`background:#005230; border:0; border-radius:999px; padding:5px 12px; color:#9FF7C4; font:inherit; font-size:11.5px; font-weight:500; cursor:pointer;`) },
                            S($l.label)
                          ) : null),
                        ($l.off ? h("button", { onClick: fn($l.pick), style: sty(`background:transparent; border:0; border-radius:999px; padding:5px 12px; color:#9AA39B; font:inherit; font-size:11.5px; cursor:pointer;`), className: "k-h25" },
                            S($l.label)
                          ) : null)
                      )))
                    ),
                    h("div", { style: sty(`position:absolute; right:10px; bottom:10px; z-index:3; display:flex; gap:5px; background:rgba(20,26,21,.9); border-radius:12px; padding:5px;`) },
                      A(v.canvasOps).map(($o, $o$i) => R($o$i, h("button", { onClick: fn($o.run), title: $o.label, style: sty(`width:30px; height:30px; border-radius:8px; background:transparent; border:0; color:#9AA39B; cursor:pointer;`), className: "k-h13" },
                          h("span", { style: sty(`font-size:17px;`), className: "msym" },
                            S($o.icon)
                          )
                        )))
                    ),
                    h("svg", { viewBox: `0 0 760 420`, preserveAspectRatio: `none`, style: sty(`position:absolute; left:0; top:0; width:760px; height:420px; pointer-events:none;`) },
                      A(v.edges).map(($e, $e$i) => R($e$i, h("path", { d: $e.d, fill: `none`, stroke: $e.stroke, strokeWidth: $e.w })))
                    ),
                    A(v.nodes).map(($n, $n$i) => R($n$i, h("div", { draggable: `true`, onDragStart: fn($n.onDragStart), onDragEnd: fn($n.onDragEnd), onClick: fn($n.pick), onContextMenu: fn($n.ctx), style: sty(`position:absolute; left:${S($n.x)}; top:${S($n.y)}; width:196px; border-radius:14px; background:#1B211C; border:2px solid ${S($n.border)}; padding:11px 13px; cursor:grab; box-shadow:0 4px 12px rgba(0,0,0,.45); transition:left .26s cubic-bezier(.2,0,0,1), top .26s cubic-bezier(.2,0,0,1), border-color .2s ease, box-shadow .2s ease;`) },
                        h("div", { style: sty(`display:flex; align-items:center; gap:8px;`) },
                          h("span", { style: sty(`font-size:18px; color:#82D9A5;`), className: "msym" },
                            S($n.icon)
                          ),
                          h("span", { title: $n.title, style: sty(`flex:1; font-size:12.5px; font-weight:500; color:#DFE4DC; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                            S($n.title)
                          ),
                          h("span", { style: sty(`font-size:15px; color:#778078;`), className: "msym" },
                            "drag_indicator"
                          )
                        ),
                        h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#9AA39B; margin-top:6px; line-height:1.45;`) },
                          S($n.detail)
                        ),
                        ($n.selected ? h("div", { style: sty(`display:flex; gap:3px; margin-top:9px; padding-top:8px; border-top:1px solid #262B26;`) },
                            h("button", { onClick: fn($n.left), title: `Nudge left`, style: sty(`width:26px; height:26px; border-radius:7px; background:#262B26; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h13" },
                              h("span", { style: sty(`font-size:15px;`), className: "msym" },
                                "chevron_left"
                              )
                            ),
                            h("button", { onClick: fn($n.up), title: `Nudge up`, style: sty(`width:26px; height:26px; border-radius:7px; background:#262B26; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h13" },
                              h("span", { style: sty(`font-size:15px;`), className: "msym" },
                                "expand_less"
                              )
                            ),
                            h("button", { onClick: fn($n.down), title: `Nudge down`, style: sty(`width:26px; height:26px; border-radius:7px; background:#262B26; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h13" },
                              h("span", { style: sty(`font-size:15px;`), className: "msym" },
                                "expand_more"
                              )
                            ),
                            h("button", { onClick: fn($n.right), title: `Nudge right`, style: sty(`width:26px; height:26px; border-radius:7px; background:#262B26; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h13" },
                              h("span", { style: sty(`font-size:15px;`), className: "msym" },
                                "chevron_right"
                              )
                            ),
                            h("div", { style: sty(`flex:1;`) }),
                            h("button", { onClick: fn($n.connect), title: `Connect to…`, style: sty(`width:26px; height:26px; border-radius:7px; background:#262B26; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h13" },
                              h("span", { style: sty(`font-size:15px;`), className: "msym" },
                                "timeline"
                              )
                            ),
                            h("button", { onClick: fn($n.dup), title: `Duplicate`, style: sty(`width:26px; height:26px; border-radius:7px; background:#262B26; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h13" },
                              h("span", { style: sty(`font-size:15px;`), className: "msym" },
                                "content_copy"
                              )
                            ),
                            h("button", { onClick: fn($n.del), title: `Delete`, style: sty(`width:26px; height:26px; border-radius:7px; background:#262B26; border:0; color:#FFB4AB; cursor:pointer;`), className: "k-h5" },
                              h("span", { style: sty(`font-size:15px;`), className: "msym" },
                                "delete"
                              )
                            )
                          ) : null)
                      ))),
                    h("div", { style: sty(`position:absolute; left:16px; bottom:14px; display:flex; gap:8px;`) },
                      A(v.paletteNodes).map(($p, $p$i) => R($p$i, h("button", { onClick: fn($p.add), style: sty(`display:flex; align-items:center; gap:6px; background:#1B211C; border:1px solid #414942; border-radius:999px; padding:7px 13px 7px 10px; color:#C4CBC2; font:inherit; font-size:12px; cursor:pointer;`), className: "k-h26" },
                          h("span", { style: sty(`font-size:16px;`), className: "msym" },
                            S($p.icon)
                          ),
                          S($p.label)
                        )))
                    )
                  ),
                  h("div", { style: sty(`background:#1B211C; border-radius:12px; padding:14px; overflow-y:auto;`) },
                    h("div", { style: sty(`font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#8FA394; font-weight:500;`) },
                      "Step inspector"
                    ),
                    h("div", { style: sty(`font-size:16px; font-weight:500; margin:8px 0 3px;`) },
                      S(v.nodeTitle)
                    ),
                    h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11.5px; color:#9AA39B; margin-bottom:14px;`) },
                      S(v.nodeApp)
                    ),
                    h("div", { style: sty(`display:flex; flex-direction:column; gap:14px;`) },
                      A(v.nodeCtls).map(($c, $c$i) => R($c$i, h(M3Control, { ctl: $c })))
                    ),
                    h("div", { style: sty(`margin-top:18px; padding-top:14px; border-top:1px solid #262B26;`) },
                      h("div", { style: sty(`display:flex; align-items:center; gap:8px; margin-bottom:10px;`) },
                        h("span", { style: sty(`font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#8FA394;`) },
                          "Connections"
                        ),
                        h("div", { style: sty(`flex:1;`) }),
                        h("button", { onClick: fn(v.addEdge), title: `Add a connection`, style: sty(`width:26px; height:26px; border-radius:50%; background:#262B26; border:0; color:#9FF7C4; cursor:pointer;`), className: "k-h11" },
                          h("span", { style: sty(`font-size:16px;`), className: "msym" },
                            "add"
                          )
                        )
                      ),
                      h("div", { style: sty(`display:flex; flex-direction:column; gap:8px;`) },
                        A(v.edgeRows).map(($e, $e$i) => R($e$i, h("div", { style: sty(`background:#141A15; border-radius:10px; padding:9px 10px;`) },
                            h("div", { style: sty(`display:flex; align-items:center; gap:6px;`) },
                              h("span", { title: $e.from, style: sty(`flex:1; font-size:11.5px; color:#DFE4DC; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                                S($e.from)
                              ),
                              h("span", { style: sty(`font-size:15px; color:#82D9A5;`), className: "msym" },
                                "arrow_forward"
                              ),
                              h("span", { title: $e.to, style: sty(`flex:1; font-size:11.5px; color:#DFE4DC; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                                S($e.to)
                              ),
                              h("button", { onClick: fn($e.del), title: `Remove`, style: sty(`width:24px; height:24px; border-radius:50%; background:transparent; border:0; color:#9AA39B; cursor:pointer;`), className: "k-h5" },
                                h("span", { style: sty(`font-size:14px;`), className: "msym" },
                                  "close"
                                )
                              )
                            ),
                            h("div", { style: sty(`font-size:10.5px; color:#8FA394; margin-top:7px;`) },
                              "Goes to"
                            ),
                            h("div", { style: sty(`display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;`) },
                              A($e.toOpts).map(($o, $o$i) => R($o$i, F(
                                ($o.on ? h("button", { onClick: fn($o.pick), style: sty(`background:#005230; border:0; border-radius:6px; padding:4px 9px; color:#9FF7C4; font:inherit; font-size:10.5px; font-weight:500; cursor:pointer;`) },
                                    S($o.label)
                                  ) : null),
                                ($o.off ? h("button", { onClick: fn($o.pick), style: sty(`background:transparent; border:1px solid #333B34; border-radius:6px; padding:4px 9px; color:#9AA39B; font:inherit; font-size:10.5px; cursor:pointer;`), className: "k-h27" },
                                    S($o.label)
                                  ) : null)
                              )))
                            )
                          )))
                      )
                    )
                  )
                )
              ) : null),
            (v.isTableLike ? h("div", { style: sty(`background:#1B211C; border-radius:16px; overflow:hidden; margin-bottom:14px;`) },
                h("div", { style: sty(`display:flex; align-items:center; gap:10px; padding:12px 16px;`) },
                  h("div", { style: sty(`display:flex; align-items:center; gap:8px; background:#141A15; border-radius:999px; padding:8px 14px; flex:1;`) },
                    h("span", { style: sty(`font-size:18px; color:#9AA39B;`), className: "msym" },
                      "search"
                    ),
                    h("span", { style: sty(`flex:1; font-family:'Roboto Mono',monospace; font-size:12px; color:#C4CBC2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                      S(v.tableSearchLabel)
                    ),
                    h("button", { onClick: fn(v.openTableRegex), title: `Regex builder`, style: sty(`width:28px; height:28px; border-radius:50%; background:#262B26; border:0; color:#82D9A5; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto;`), className: "k-h11" },
                      h("span", { style: sty(`font-size:16px;`), className: "msym" },
                        "data_object"
                      )
                    ),
                    h("span", { style: sty(`width:1px; height:20px; background:#333B34; flex:0 0 auto;`) }),
                    h("span", { style: sty(`font-size:12.5px; color:#9AA39B; flex:0 0 auto;`) },
                      "Filter"
                    ),
                    A(v.tableFilters).map(($f, $f$i) => R($f$i, F(
                      ($f.on ? h("button", { onClick: fn($f.pick), style: sty(`display:flex; align-items:center; gap:5px; background:#005230; border:0; border-radius:8px; padding:5px 12px; color:#9FF7C4; font:inherit; font-size:12px; font-weight:500; cursor:pointer;`) },
                          h("span", { style: sty(`font-size:15px;`), className: "msym" },
                            "check"
                          ),
                          S($f.label)
                        ) : null),
                      ($f.off ? h("button", { onClick: fn($f.pick), style: sty(`background:transparent; border:1px solid #414942; border-radius:8px; padding:5px 12px; color:#C4CBC2; font:inherit; font-size:12px; cursor:pointer;`), className: "k-h1" },
                          S($f.label)
                        ) : null)
                    )))
                  ),
                  h("button", { onClick: fn(v.openWizard), style: sty(`display:flex; align-items:center; gap:7px; background:#1B4D33; border:0; border-radius:999px; padding:10px 18px 10px 14px; color:#9FF7C4; font:inherit; font-size:13px; font-weight:500; cursor:pointer;`), className: "k-h3" },
                    h("span", { style: sty(`font-size:18px;`), className: "msym" },
                      "add"
                    ),
                    S(v.tableAddLabel)
                  )
                ),
                (v.hasSelection ? h("div", { style: sty(`display:flex; align-items:center; gap:10px; padding:10px 16px; background:#005230; flex-wrap:wrap; animation:m3Slide .24s cubic-bezier(.2,1.2,.4,1);`) },
                    h("span", { style: sty(`font-size:19px; color:#9FF7C4;`), className: "msym" },
                      "checklist"
                    ),
                    h("span", { style: sty(`font-size:13px; font-weight:500; color:#DFF3E5;`) },
                      S(v.selectionLabel)
                    ),
                    h("div", { style: sty(`flex:1;`) }),
                    A(v.bulkActions).map(($b, $b$i) => R($b$i, h("button", { onClick: fn($b.run), style: sty(`display:flex; align-items:center; gap:6px; background:rgba(0,0,0,.24); border:0; border-radius:999px; padding:7px 14px 7px 11px; color:#9FF7C4; font:inherit; font-size:12.5px; cursor:pointer;`), className: "k-h28" },
                        h("span", { style: sty(`font-size:16px;`), className: "msym" },
                          S($b.icon)
                        ),
                        S($b.label)
                      ))),
                    h("button", { onClick: fn(v.clearSelection), style: sty(`background:transparent; border:0; color:#C3EFD5; font:inherit; font-size:12.5px; cursor:pointer; padding:7px 10px;`) },
                      "Clear"
                    )
                  ) : null),
                h("div", { style: sty(`display:grid; grid-template-columns:44px ${S(v.tableGrid)}; gap:10px; padding:8px 16px; background:#141A15; font-size:11px; letter-spacing:.7px; text-transform:uppercase; color:#8FA394; font-weight:500; align-items:center;`) },
                  h("button", { onClick: fn(v.toggleAll), title: `Select all`, style: sty(`width:24px; height:24px; border-radius:5px; border:2px solid ${S(v.allBorder)}; background:${S(v.allBg)}; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;`) },
                    h("span", { style: sty(`font-size:15px; color:#00391F;`), className: "msym" },
                      S(v.allIcon)
                    )
                  ),
                  A(v.tableCols).map(($h, $h$i) => R($h$i, h("div", null,
                      S($h)
                    )))
                ),
                A(v.tableRows).map(($r, $r$i) => R($r$i, h("div", { onContextMenu: fn($r.ctx), style: sty(`display:grid; grid-template-columns:44px ${S(v.tableGrid)}; gap:10px; padding:12px 16px; border-top:1px solid #262B26; cursor:pointer; align-items:center; background:${S($r.bg)}; animation:m3Slide .26s cubic-bezier(.2,0,0,1) both; ${S($r.rnd)}`), className: "k-h16" },
                    h("button", { onClick: fn($r.toggle), style: sty(`width:24px; height:24px; border-radius:5px; border:2px solid ${S($r.border)}; background:${S($r.checkBg)}; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;`) },
                      h("span", { style: sty(`font-size:15px; color:#00391F;`), className: "msym" },
                        S($r.checkIcon)
                      )
                    ),
                    A($r.cells).map(($c, $c$i) => R($c$i, F(
                      ($c.isChip ? h("div", null,
                          h("span", { style: sty(`display:inline-flex; align-items:center; gap:5px; background:${S($c.bg)}; color:${S($c.fg)}; border-radius:8px; padding:3px 10px; font-size:11.5px; font-weight:500;`) },
                            h("span", { style: sty(`width:6px; height:6px; border-radius:50%; background:${S($c.fg)};`) }),
                            S($c.text)
                          )
                        ) : null),
                      ($c.isMono ? h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12.5px; color:#C4CBC2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                          S($c.text)
                        ) : null),
                      ($c.isText ? h("div", { style: sty(`font-size:13px; color:#DFE4DC; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                          S($c.text)
                        ) : null)
                    )))
                  ))),
                (v.noTableRows ? h("div", { style: sty(`padding:18px 16px; font-size:13px; color:#9AA39B; line-height:1.5;`) },
                    S(v.tableEmptyText)
                  ) : null)
              ) : null),
            (v.isCli ? h("div", { style: sty(`display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;`) },
                h("div", { style: sty(`background:#1B211C; border-radius:16px; padding:16px 18px;`) },
                  h("div", { style: sty(`font-size:15px; font-weight:500; margin-bottom:4px;`) },
                    "Command builder"
                  ),
                  h("div", { style: sty(`font-size:12.5px; color:#9AA39B; margin-bottom:14px; line-height:1.5;`) },
                    "Pick each part. Nothing is typed — the console assembles a real CLI command and shows you what it will do before it runs."
                  ),
                  h("div", { style: sty(`display:flex; flex-direction:column; gap:14px;`) },
                    A(v.cliSteps).map(($s, $s$i) => R($s$i, h("div", null,
                        h("div", { style: sty(`display:flex; align-items:center; gap:7px; margin-bottom:7px;`) },
                          h("span", { style: sty(`font-size:12px; font-weight:500; color:#C4CBC2;`) },
                            S($s.label)
                          ),
                          h("button", { onClick: fn($s.info), style: sty(`width:24px; height:24px; border-radius:50%; background:#262B26; border:0; color:#82D9A5; cursor:pointer; display:flex; align-items:center; justify-content:center;`), className: "k-h11" },
                            h("span", { style: sty(`font-size:14px;`), className: "msym" },
                              "info"
                            )
                          )
                        ),
                        h("div", { style: sty(`display:flex; flex-wrap:wrap; gap:7px;`) },
                          A($s.options).map(($o, $o$i) => R($o$i, F(
                            ($o.on ? h("button", { onClick: fn($o.pick), style: sty(`background:#005230; border:0; border-radius:8px; padding:7px 14px; color:#9FF7C4; font-family:'Roboto Mono',monospace; font-size:12.5px; font-weight:500; cursor:pointer;`) },
                                S($o.label)
                              ) : null),
                            ($o.off ? h("button", { onClick: fn($o.pick), style: sty(`background:transparent; border:1px solid #414942; border-radius:8px; padding:7px 14px; color:#C4CBC2; font-family:'Roboto Mono',monospace; font-size:12.5px; cursor:pointer;`), className: "k-h1" },
                                S($o.label)
                              ) : null)
                          )))
                        )
                      )))
                  ),
                  h("div", { style: sty(`margin-top:18px; background:#0C110D; border-radius:12px; padding:14px;`) },
                    h("div", { style: sty(`font-size:11px; letter-spacing:.8px; text-transform:uppercase; color:#8FA394; margin-bottom:8px;`) },
                      "Assembled command"
                    ),
                    h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:14px; color:#9FF7C4; word-break:break-all;`) },
                      S(v.cliCommand)
                    ),
                    h("div", { style: sty(`font-size:12.5px; color:#9AA39B; margin-top:10px; line-height:1.5;`) },
                      S(v.cliExplain)
                    ),
                    h("button", { onClick: fn(v.runCli), style: sty(`margin-top:14px; display:flex; align-items:center; gap:7px; background:#82D9A5; border:0; border-radius:999px; padding:10px 20px 10px 15px; color:#00391F; font:inherit; font-size:13px; font-weight:500; cursor:pointer;`), className: "k-h12" },
                      h("span", { style: sty(`font-size:18px;`), className: "msym" },
                        "play_arrow"
                      ),
                      "Run with confirmation"
                    )
                  )
                ),
                h("div", { style: sty(`background:#0C110D; border-radius:16px; padding:16px 18px; display:flex; flex-direction:column; min-height:440px;`) },
                  h("div", { style: sty(`display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;`) },
                    h("span", { style: sty(`font-size:15px; font-weight:500;`) },
                      "Raw console"
                    ),
                    h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#8FA394;`) },
                      "read-only · expert"
                    )
                  ),
                  h("div", { style: sty(`flex:1; overflow-y:auto; font-family:'Roboto Mono',monospace; font-size:12px; line-height:1.75;`) },
                    A(v.cliLog).map(($l, $l$i) => R($l$i, h("div", { style: sty(`color:${S($l.color)}; white-space:pre-wrap;`) },
                        S($l.text)
                      )))
                  )
                )
              ) : null),
            (v.isMemory ? h("div", { style: sty(`display:grid; grid-template-columns:1fr 320px; gap:12px; margin-bottom:14px;`) },
                h("div", { style: sty(`display:flex; flex-direction:column; gap:12px;`) },
                  h("div", { style: sty(`background:#1B211C; border-radius:16px; padding:16px 18px;`) },
                    h("div", { style: sty(`display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;`) },
                      h("span", { style: sty(`font-size:15px; font-weight:500;`) },
                        "Regex builder"
                      ),
                      h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#82D9A5;`) },
                        S(v.regexMatches)
                      )
                    ),
                    h("div", { style: sty(`display:flex; flex-wrap:wrap; gap:7px; margin-bottom:12px;`) },
                      A(v.regexTokens).map(($t, $t$i) => R($t$i, h("button", { onClick: fn($t.remove), style: sty(`display:flex; align-items:center; gap:6px; background:#005230; border:0; border-radius:8px; padding:6px 10px 6px 12px; color:#9FF7C4; font-family:'Roboto Mono',monospace; font-size:12px; cursor:pointer;`) },
                          S($t.label),
                          h("span", { style: sty(`font-size:14px;`), className: "msym" },
                            "close"
                          )
                        ))),
                      A(v.regexPalette).map(($p, $p$i) => R($p$i, h("button", { onClick: fn($p.add), style: sty(`background:transparent; border:1px dashed #414942; border-radius:8px; padding:6px 12px; color:#9AA39B; font-family:'Roboto Mono',monospace; font-size:12px; cursor:pointer;`), className: "k-h26" },
                          S($p.label)
                        )))
                    ),
                    h("div", { style: sty(`background:#0C110D; border-radius:12px; padding:12px; font-family:'Roboto Mono',monospace; font-size:13px; color:#9FF7C4; word-break:break-all;`) },
                      S(v.regexValue)
                    )
                  ),
                  h("div", { style: sty(`background:#1B211C; border-radius:16px; overflow:hidden;`) },
                    h("div", { style: sty(`padding:14px 18px; font-size:15px; font-weight:500;`) },
                      "Memory records"
                    ),
                    A(v.memRows).map(($m, $m$i) => R($m$i, h("div", { style: sty(`padding:12px 18px; border-top:1px solid #262B26; display:grid; grid-template-columns:150px 1fr 92px; gap:12px; align-items:center; animation:m3Slide .26s cubic-bezier(.2,0,0,1) both;`), className: "k-h16" },
                        h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12px; color:#82D9A5;`) },
                          S($m.scope)
                        ),
                        h("span", { style: sty(`font-size:12.5px; color:#C4CBC2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                          S($m.text)
                        ),
                        h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#778078; text-align:right;`) },
                          S($m.when)
                        )
                      )))
                  )
                ),
                h("div", { style: sty(`display:flex; flex-direction:column; gap:12px;`) },
                  A(v.memPanels).map(($p, $p$i) => R($p$i, h("div", { style: sty(`background:#1B211C; border-radius:16px; padding:16px 18px;`) },
                      h("div", { style: sty(`display:flex; align-items:center; gap:8px; margin-bottom:10px;`) },
                        h("span", { style: sty(`font-size:19px; color:#82D9A5;`), className: "msym" },
                          S($p.icon)
                        ),
                        h("span", { style: sty(`font-size:14.5px; font-weight:500;`) },
                          S($p.title)
                        )
                      ),
                      A($p.rows).map(($r, $r$i) => R($r$i, h("div", { style: sty(`display:flex; justify-content:space-between; padding:6px 0; font-size:12.5px;`) },
                          h("span", { style: sty(`color:#9AA39B;`) },
                            S($r.k)
                          ),
                          h("span", { style: sty(`font-family:'Roboto Mono',monospace; color:#C4CBC2;`) },
                            S($r.v)
                          )
                        ))),
                      h("button", { onClick: fn($p.act), style: sty(`margin-top:10px; width:100%; background:#262B26; border:0; border-radius:999px; padding:9px 0; color:#9FF7C4; font:inherit; font-size:12.5px; font-weight:500; cursor:pointer;`), className: "k-h11" },
                        S($p.action)
                      )
                    )))
                )
              ) : null),
            (v.isDocs ? h("div", { style: sty(`display:grid; grid-template-columns:340px 1fr; gap:12px; margin-bottom:14px;`) },
                h("div", { style: sty(`display:flex; flex-direction:column; gap:12px;`) },
                  h("div", { style: sty(`background:#1B211C; border-radius:16px; padding:14px 16px;`) },
                    h("div", { style: sty(`display:flex; align-items:center; gap:8px; margin-bottom:10px;`) },
                      h("span", { style: sty(`font-size:18px; color:#82D9A5;`), className: "msym" },
                        "search"
                      ),
                      h("input", { value: v.docsQuery, onChange: fn(v.setDocsQuery), placeholder: `Search articles`, style: sty(`flex:1; background:#0C110D; border:1px solid #333B34; border-radius:8px; padding:8px 10px; color:#E2E9E1; font:inherit; font-size:12.5px;`) }),
                      h("button", { onClick: fn(v.toggleDocsRegex), title: `Regular expression`, style: sty(`width:28px; height:28px; border-radius:8px; border:1px solid #414942; background:${S(v.docsRegexBg)}; color:${S(v.docsRegexColor)}; cursor:pointer; display:flex; align-items:center; justify-content:center;`) },
                        h("span", { style: sty(`font-size:15px;`), className: "msym" },
                          "regular_expression"
                        )
                      )
                    ),
                    (v.docsRegexOn ? h("div", { style: sty(`display:flex; flex-wrap:wrap; gap:6px; margin-bottom:2px;`) },
                        A(v.docsRegexPalette).map(($p, $p$i) => R($p$i, h("button", { onClick: fn($p.add), style: sty(`background:transparent; border:1px dashed #414942; border-radius:8px; padding:5px 10px; color:#9AA39B; font-family:'Roboto Mono',monospace; font-size:11.5px; cursor:pointer;`), className: "k-h26" },
                            S($p.label)
                          )))
                      ) : null),
                    (v.docsQueryError ? h("div", { style: sty(`font-size:11.5px; color:#FFB4AB; margin-top:6px;`) },
                        S(v.docsQueryError)
                      ) : null)
                  ),
                  h("div", { style: sty(`background:#1B211C; border-radius:16px; overflow:hidden; flex:1; min-height:420px; display:flex; flex-direction:column;`) },
                    h("div", { style: sty(`padding:12px 16px; font-size:12px; color:#9AA39B;`) },
                      S(v.docsResultsLabel)
                    ),
                    h("div", { style: sty(`overflow-y:auto; flex:1;`) },
                      A(v.docsResults).map(($r, $r$i) => R($r$i, h("div", { onClick: fn($r.select), style: sty(`padding:10px 16px; border-top:1px solid #262B26; cursor:pointer; background:${S($r.bg)};`), className: "k-h16" },
                          h("div", { style: sty(`display:flex; align-items:center; gap:8px;`) },
                            h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:10.5px; color:#82D9A5; text-transform:uppercase;`) },
                              S($r.category)
                            ),
                            h("span", { style: sty(`font-size:13px; color:#E2E9E1; font-weight:500;`) },
                              S($r.title)
                            )
                          ),
                          h("div", { style: sty(`font-size:11.5px; color:#9AA39B; margin-top:3px;`) },
                            S($r.excerpt)
                          )
                        )))
                    )
                  )
                ),
                h("div", { style: sty(`background:#1B211C; border-radius:16px; padding:20px 24px; min-height:440px; display:flex; flex-direction:column; gap:10px;`) },
                  h("div", { style: sty(`display:flex; align-items:baseline; gap:10px;`) },
                    h("span", { style: sty(`font-size:19px; font-weight:500;`) },
                      S(v.docsSelectedTitle)
                    ),
                    h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#8FA394; text-transform:uppercase;`) },
                      S(v.docsSelectedCategory)
                    )
                  ),
                  h("div", { style: sty(`font-size:13.5px; color:#C4CBC2; line-height:1.7; max-width:78ch; overflow-y:auto;`) },
                    A(v.docsBlocks).map(($b, $b$i) => R($b$i, F(
                      ($b.isH1 ? h("div", { style: sty(`font-size:20px; font-weight:500; color:#E2E9E1; margin:14px 0 6px;`) },
                          S($b.text)
                        ) : null),
                      ($b.isH2 ? h("div", { style: sty(`font-size:16.5px; font-weight:500; color:#E2E9E1; margin:14px 0 6px;`) },
                          S($b.text)
                        ) : null),
                      ($b.isH3 ? h("div", { style: sty(`font-size:14.5px; font-weight:500; color:#C4CBC2; margin:12px 0 5px;`) },
                          S($b.text)
                        ) : null),
                      ($b.isCode ? h("pre", { style: sty(`background:#0C110D; border-radius:10px; padding:12px 14px; font-family:'Roboto Mono',monospace; font-size:12px; color:#9FF7C4; overflow-x:auto; margin:8px 0;`) },
                          S($b.text)
                        ) : null),
                      ($b.isListItem ? h("div", { style: sty(`display:flex; gap:8px; margin:2px 0;`) },
                          h("span", { style: sty(`color:#8FA394;`) },
                            "•"
                          ),
                          h("span", null,
                            A($b.spans).map(($sp, $sp$i) => R($sp$i, F(
                              ($sp.isLink ? h("span", { onClick: fn($sp.onClick), style: sty(`color:#9FF7C4; text-decoration:underline; cursor:pointer;`) },
                                  S($sp.text)
                                ) : null),
                              ($sp.isPlain ? h("span", null,
                                  S($sp.text)
                                ) : null)
                            )))
                          )
                        ) : null),
                      ($b.isParagraph ? h("div", { style: sty(`margin:8px 0;`) },
                          A($b.spans).map(($sp, $sp$i) => R($sp$i, F(
                            ($sp.isLink ? h("span", { onClick: fn($sp.onClick), style: sty(`color:#9FF7C4; text-decoration:underline; cursor:pointer;`) },
                                S($sp.text)
                              ) : null),
                            ($sp.isPlain ? h("span", null,
                                S($sp.text)
                              ) : null)
                          )))
                        ) : null)
                    )))
                  ),
                  (v.docsHasSuggested ? h("div", { style: sty(`margin-top:14px; background:#0C110D; border-radius:12px; padding:14px 16px;`) },
                      h("div", { style: sty(`font-size:11px; letter-spacing:.8px; text-transform:uppercase; color:#8FA394; margin-bottom:8px;`) },
                        "Suggested articles"
                      ),
                      A(v.docsSuggested).map(($sg, $sg$i) => R($sg$i, h("div", { onClick: fn($sg.select), style: sty(`display:flex; align-items:center; gap:8px; padding:6px 0; cursor:pointer; color:#9FF7C4; font-size:12.5px;`), className: "k-h29" },
                          h("span", { style: sty(`font-size:15px;`), className: "msym" },
                            S($sg.icon)
                          ),
                          S($sg.title)
                        )))
                    ) : null)
                )
              ) : null),
            (v.isChangelog ? h("div", { style: sty(`display:flex; flex-direction:column; gap:12px;`) },
                h("div", { style: sty(`background:#1B211C; border-radius:16px; padding:14px 16px; display:flex; flex-wrap:wrap; align-items:flex-end; gap:14px;`) },
                  h("div", { style: sty(`display:flex; flex-direction:column; gap:4px;`) },
                    h("span", { style: sty(`font-size:11px; color:#8FA394; text-transform:uppercase; letter-spacing:.6px;`) },
                      "From"
                    ),
                    h("input", { value: v.changelogFrom, onChange: fn(v.setChangelogFrom), placeholder: `YYYY-MM-DD`, style: sty(`width:130px; background:#0C110D; border:1px solid #333B34; border-radius:8px; padding:8px 10px; color:#E2E9E1; font:inherit; font-family:'Roboto Mono',monospace; font-size:12px;`) })
                  ),
                  h("div", { style: sty(`display:flex; flex-direction:column; gap:4px;`) },
                    h("span", { style: sty(`font-size:11px; color:#8FA394; text-transform:uppercase; letter-spacing:.6px;`) },
                      "To"
                    ),
                    h("input", { value: v.changelogTo, onChange: fn(v.setChangelogTo), placeholder: `YYYY-MM-DD`, style: sty(`width:130px; background:#0C110D; border:1px solid #333B34; border-radius:8px; padding:8px 10px; color:#E2E9E1; font:inherit; font-family:'Roboto Mono',monospace; font-size:12px;`) })
                  ),
                  h("div", { style: sty(`display:flex; gap:6px; flex-wrap:wrap;`) },
                    A(v.changelogPresets).map(($pr, $pr$i) => R($pr$i, h("button", { onClick: fn($pr.apply), style: sty(`background:transparent; border:1px solid #414942; border-radius:999px; padding:6px 12px; color:#C4CBC2; font:inherit; font-size:11.5px; cursor:pointer;`), className: "k-h1" },
                        S($pr.label)
                      )))
                  ),
                  h("div", { style: sty(`flex:1; min-width:220px; display:flex; align-items:center; gap:8px;`) },
                    h("span", { style: sty(`font-size:18px; color:#82D9A5;`), className: "msym" },
                      "search"
                    ),
                    h("input", { value: v.changelogQuery, onChange: fn(v.setChangelogQuery), placeholder: `Search changelog text`, style: sty(`flex:1; background:#0C110D; border:1px solid #333B34; border-radius:8px; padding:8px 10px; color:#E2E9E1; font:inherit; font-size:12.5px;`) }),
                    h("button", { onClick: fn(v.toggleChangelogRegex), title: `Regular expression`, style: sty(`width:28px; height:28px; border-radius:8px; border:1px solid #414942; background:${S(v.changelogRegexBg)}; color:${S(v.changelogRegexColor)}; cursor:pointer; display:flex; align-items:center; justify-content:center;`) },
                      h("span", { style: sty(`font-size:15px;`), className: "msym" },
                        "regular_expression"
                      )
                    )
                  ),
                  h("div", { style: sty(`display:flex; gap:8px;`) },
                    h("button", { onClick: fn(v.changelogCopy), style: sty(`display:flex; align-items:center; gap:6px; background:transparent; border:1px solid #414942; border-radius:999px; padding:7px 14px; color:#C4CBC2; font:inherit; font-size:12.5px; cursor:pointer;`), className: "k-h1" },
                      h("span", { style: sty(`font-size:15px; color:#82D9A5;`), className: "msym" },
                        "content_copy"
                      ),
                      "Copy"
                    ),
                    h("button", { onClick: fn(v.changelogExport), style: sty(`display:flex; align-items:center; gap:6px; background:transparent; border:1px solid #414942; border-radius:999px; padding:7px 14px; color:#C4CBC2; font:inherit; font-size:12.5px; cursor:pointer;`), className: "k-h1" },
                      h("span", { style: sty(`font-size:15px; color:#82D9A5;`), className: "msym" },
                        "download"
                      ),
                      "Export"
                    )
                  )
                ),
                (v.changelogRegexOn ? h("div", { style: sty(`display:flex; flex-wrap:wrap; gap:6px;`) },
                    A(v.changelogRegexPalette).map(($p, $p$i) => R($p$i, h("button", { onClick: fn($p.add), style: sty(`background:transparent; border:1px dashed #414942; border-radius:8px; padding:5px 10px; color:#9AA39B; font-family:'Roboto Mono',monospace; font-size:11.5px; cursor:pointer;`), className: "k-h26" },
                        S($p.label)
                      )))
                  ) : null),
                (v.changelogQueryError ? h("div", { style: sty(`font-size:11.5px; color:#FFB4AB;`) },
                    S(v.changelogQueryError)
                  ) : null),
                (v.changelogDateError ? h("div", { style: sty(`font-size:11.5px; color:#FFB4AB;`) },
                    S(v.changelogDateError)
                  ) : null),
                h("div", { style: sty(`display:flex; align-items:center; justify-content:space-between; padding:0 4px;`) },
                  h("span", { style: sty(`font-size:12px; color:#9AA39B;`) },
                    S(v.changelogResultsLabel)
                  ),
                  h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#8FA394;`) },
                    S(v.changelogRangeLabel)
                  )
                ),
                A(v.changelogEntries).map(($e, $e$i) => R($e$i, h("div", { style: sty(`background:#1B211C; border-radius:16px; padding:16px 20px;`) },
                    h("div", { style: sty(`display:flex; align-items:baseline; gap:12px; margin-bottom:8px;`) },
                      h("span", { style: sty(`font-size:16.5px; font-weight:500; color:#E2E9E1;`) },
                        S($e.version)
                      ),
                      h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11.5px; color:#8FA394;`) },
                        S($e.date)
                      )
                    ),
                    A($e.changes).map(($c, $c$i) => R($c$i, h("div", { style: sty(`display:flex; align-items:baseline; gap:8px; padding:4px 0; font-size:12.5px;`) },
                        h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:10px; color:#82D9A5; text-transform:uppercase; min-width:70px;`) },
                          S($c.category)
                        ),
                        h("span", { style: sty(`color:#C4CBC2; flex:1;`) },
                          S($c.summary)
                        ),
                        h("a", { href: $c.commitUrl, target: `_blank`, rel: `noreferrer`, style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#9FF7C4; text-decoration:none;`) },
                          S($c.commitShort)
                        )
                      )))
                  )))
              ) : null),
            (v.isCodecGraph ? h("div", { style: sty(`background:#1B211C; border-radius:16px; padding:16px 18px; margin-bottom:14px;`) },
                h("div", { style: sty(`display:flex; align-items:center; gap:8px; margin-bottom:4px;`) },
                  h("span", { style: sty(`font-size:19px; color:#82D9A5;`), className: "msym" },
                    "hub"
                  ),
                  h("span", { style: sty(`font-size:14.5px; font-weight:500;`) },
                    "Codec translation graph"
                  )
                ),
                h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11.5px; color:#9AA39B; margin-bottom:10px;`) },
                  S(v.codecGraphStatus)
                ),
                (v.codecGraphHasData ? h("div", { style: sty(`position:relative; width:100%; max-width:640px; height:300px;`) },
                    h("svg", { viewBox: `0 0 460 300`, style: sty(`position:absolute; left:0; top:0; width:100%; height:300px; pointer-events:none;`) },
                      A(v.codecGraphEdges).map(($e, $e$i) => R($e$i, h("path", { d: $e.d, fill: `none`, stroke: `#37483D`, strokeWidth: `1.4` })))
                    ),
                    A(v.codecGraphNodes).map(($n, $n$i) => R($n$i, h("div", { style: sty(`position:absolute; left:${S($n.x)}; top:${S($n.y)}; width:72px; height:72px; border-radius:50%; background:#1B211C; border:2px solid ${S($n.fill)}; display:flex; align-items:center; justify-content:center; text-align:center; padding:4px;`) },
                        h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:10px; color:#DFE4DC; overflow:hidden; word-break:break-all;`) },
                          S($n.label)
                        )
                      )))
                  ) : null),
                (v.codecGraphUnreachableLabel ? h("div", { style: sty(`font-size:11.5px; color:#FFB4AB; margin-top:8px;`) },
                    S(v.codecGraphUnreachableLabel)
                  ) : null)
              ) : null),
            (v.isEndpointGraph ? h("div", { style: sty(`background:#1B211C; border-radius:16px; padding:16px 18px; margin-bottom:14px;`) },
                h("div", { style: sty(`display:flex; align-items:center; gap:8px; margin-bottom:4px;`) },
                  h("span", { style: sty(`font-size:19px; color:#82D9A5;`), className: "msym" },
                    "device_hub"
                  ),
                  h("span", { style: sty(`font-size:14.5px; font-weight:500;`) },
                    "Endpoint reachability graph"
                  )
                ),
                h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11.5px; color:#9AA39B; margin-bottom:10px;`) },
                  S(v.endpointGraphStatus)
                ),
                (v.endpointGraphHasData ? h("div", { style: sty(`position:relative; overflow:auto; max-height:420px; border-radius:12px; background:#0C110D;`) },
                    h("div", { style: sty(`position:relative; width:${S(v.endpointGraphWidth)}; height:${S(v.endpointGraphHeight)};`) },
                      h("svg", { style: sty(`position:absolute; left:0; top:0; width:${S(v.endpointGraphWidth)}; height:${S(v.endpointGraphHeight)}; pointer-events:none;`) },
                        A(v.endpointGraphEdges).map(($e, $e$i) => R($e$i, h("path", { d: $e.d, fill: `none`, stroke: `#37483D`, strokeWidth: `1.6` })))
                      ),
                      A(v.endpointGraphNodes).map(($n, $n$i) => R($n$i, h("div", { title: $n.detail, style: sty(`position:absolute; left:${S($n.x)}; top:${S($n.y)}; width:168px; border-radius:10px; background:#1B211C; border:2px solid ${S($n.fill)}; padding:6px 9px;`) },
                          h("div", { style: sty(`font-size:11.5px; font-weight:500; color:#DFE4DC; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                            S($n.label)
                          ),
                          h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:10px; color:#9AA39B; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                            S($n.detail)
                          )
                        )))
                    )
                  ) : null),
                A(v.endpointGraphBroken).map(($b, $b$i) => R($b$i, h("div", { style: sty(`font-size:11.5px; color:#FFB4AB; margin-top:4px;`) },
                    S($b)
                  )))
              ) : null),
            A(v.groups).map(($g, $g$i) => R($g$i, h("div", { style: sty(`background:#1B211C; border-radius:16px; padding:18px 20px; margin-bottom:12px; animation:m3Rise .36s cubic-bezier(.2,0,0,1) both; ${S($g.rnd)}`) },
                h("div", { style: sty(`display:flex; align-items:flex-start; gap:12px; margin-bottom:16px;`) },
                  h("div", { style: sty(`flex:1;`) },
                    h("div", { style: sty(`font-size:15.5px; font-weight:500;`) },
                      S($g.title)
                    ),
                    h("div", { style: sty(`font-size:12.5px; color:#9AA39B; margin-top:4px; line-height:1.5; max-width:80ch;`) },
                      S($g.desc)
                    )
                  ),
                  h("button", { onClick: fn($g.wizard), style: sty(`display:flex; align-items:center; gap:6px; background:transparent; border:1px solid #414942; border-radius:999px; padding:7px 14px 7px 11px; color:#C4CBC2; font:inherit; font-size:12.5px; cursor:pointer; white-space:nowrap;`), className: "k-h1" },
                    h("span", { style: sty(`font-size:16px; color:#82D9A5;`), className: "msym" },
                      "auto_fix_high"
                    ),
                    "Wizard"
                  )
                ),
                h("div", { style: sty(`display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px 24px;`) },
                  A($g.ctls).map(($c, $c$i) => R($c$i, h(M3Control, { ctl: $c })))
                )
              )))
          )
        )
      ),
      (v.infoOpen ? F(
        h("div", { onClick: fn(v.closeInfo), style: sty(`position:absolute; inset:0; background:rgba(0,0,0,.32); z-index:60;`) }),
        h("div", { style: sty(`position:absolute; ${S(v.infoChrome)} max-height:calc(100vh - 132px); overflow-y:auto; background:#252B25; padding:18px 20px; box-shadow:0 8px 28px rgba(0,0,0,.6); z-index:61;`) },
          h("div", { onMouseDown: fn(v.dragInfo), style: sty(`display:flex; align-items:center; gap:8px; margin:-18px -20px 10px; padding:14px 16px 8px; cursor:grab; min-width:0;`) },
            h("span", { style: sty(`font-size:16px; color:#778078; flex:0 0 auto;`), className: "msym" },
              "drag_indicator"
            ),
            h("span", { style: sty(`font-size:18px; color:#82D9A5; flex:0 0 auto;`), className: "msym" },
              "school"
            ),
            h("span", { style: sty(`flex:1 1 auto; min-width:0; font-size:14.5px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
              S(v.infoTitle)
            ),
            h("span", { style: sty(`display:flex; gap:2px; flex:0 0 auto;`) }),
            A(v.infoDockOpts).map(($d, $d$i) => R($d$i, F(
              ($d.on ? h("button", { onClick: fn($d.pick), title: $d.label, style: sty(`width:24px; height:24px; border-radius:7px; background:#005230; border:0; color:#9FF7C4; cursor:pointer;`) },
                  h("span", { style: sty(`font-size:14px;`), className: "msym" },
                    S($d.icon)
                  )
                ) : null),
              ($d.off ? h("button", { onClick: fn($d.pick), title: $d.label, style: sty(`width:24px; height:24px; border-radius:7px; background:transparent; border:0; color:#778078; cursor:pointer;`), className: "k-h30" },
                  h("span", { style: sty(`font-size:14px;`), className: "msym" },
                    S($d.icon)
                  )
                ) : null)
            )))
          ),
          h("div", { style: sty(`font-size:13px; color:#C4CBC2; line-height:1.65; text-wrap:pretty;`) },
            S(v.infoBody)
          ),
          (v.hasDoc ? F(
            h("div", { style: sty(`margin-top:14px; background:#141A15; border-radius:12px; overflow:hidden;`) },
              h("div", { style: sty(`padding:9px 14px; font-size:10.5px; letter-spacing:1px; text-transform:uppercase; color:#8FA394; background:#1B211C;`) },
                `Reference · ${S(v.infoKey)}`
              ),
              A(v.docSpec).map(($r, $r$i) => R($r$i, h("div", { style: sty(`display:grid; grid-template-columns:112px 1fr; gap:10px; padding:7px 14px; border-top:1px solid #1B211C;`) },
                  h("span", { style: sty(`font-size:11.5px; color:#8FA394;`) },
                    S($r.k)
                  ),
                  h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11.5px; color:#C4CBC2; line-height:1.5; word-break:break-word;`) },
                    S($r.v)
                  )
                )))
            ),
            h("div", { style: sty(`margin-top:12px; background:#141A15; border-radius:12px; padding:12px 14px;`) },
              h("div", { style: sty(`font-size:10.5px; letter-spacing:1px; text-transform:uppercase; color:#8FA394; margin-bottom:6px;`) },
                "Why it exists"
              ),
              h("div", { style: sty(`font-size:12.5px; color:#C4CBC2; line-height:1.6;`) },
                S(v.docWhy)
              )
            ),
            h("div", { style: sty(`margin-top:8px; background:#141A15; border-radius:12px; padding:12px 14px;`) },
              h("div", { style: sty(`font-size:10.5px; letter-spacing:1px; text-transform:uppercase; color:#8FA394; margin-bottom:6px;`) },
                "Choosing a value"
              ),
              h("div", { style: sty(`font-size:12.5px; color:#C4CBC2; line-height:1.6;`) },
                S(v.docValues)
              )
            ),
            h("div", { style: sty(`margin-top:8px; background:#3A2A12; border-radius:12px; padding:12px 14px;`) },
              h("div", { style: sty(`font-size:10.5px; letter-spacing:1px; text-transform:uppercase; color:#FFD68A; margin-bottom:6px;`) },
                "Gotcha"
              ),
              h("div", { style: sty(`font-size:12.5px; color:#FFE7BC; line-height:1.6;`) },
                S(v.docGotcha)
              )
            )
          ) : null),
          h("div", { style: sty(`margin-top:14px; background:#141A15; border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:8px;`) },
            h("div", { style: sty(`font-size:11px; letter-spacing:.8px; text-transform:uppercase; color:#8FA394;`) },
              "Pretend you arrived yesterday"
            ),
            h("div", { style: sty(`font-size:12.5px; color:#9AA39B; line-height:1.6;`) },
              S(v.infoPlain)
            )
          ),
          (v.hasDoc ? h("div", { style: sty(`margin-top:12px; background:#0C110D; border:1px solid #333B34; border-radius:14px; padding:14px;`) },
              h("div", { style: sty(`display:flex; align-items:center; gap:9px; margin-bottom:10px;`) },
                h("span", { style: sty(`font-size:18px; color:#82D9A5;`), className: "msym" },
                  "science"
                ),
                h("span", { style: sty(`font-size:12.5px; font-weight:500; color:#DFE4DC;`) },
                  "Playground"
                ),
                h("div", { style: sty(`flex:1;`) }),
                h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:10.5px; color:#8FA394;`) },
                  "nothing here touches the PBX"
                )
              ),
              h("div", { style: sty(`background:#141A15; border-radius:10px; padding:12px;`) },
                A(v.playCtl).map(($c, $c$i) => R($c$i, h(M3Control, { ctl: $c })))
              ),
              h("div", { style: sty(`display:flex; align-items:center; gap:8px; margin-top:12px;`) },
                h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:10.5px; letter-spacing:.8px; text-transform:uppercase; color:#8FA394;`) },
                  "Simulated call"
                ),
                h("div", { style: sty(`flex:1;`) }),
                h("button", { onClick: fn(v.simRun), style: sty(`display:flex; align-items:center; gap:6px; background:#1B4D33; border:0; border-radius:999px; padding:6px 13px 6px 10px; color:#9FF7C4; font:inherit; font-size:11.5px; font-weight:500; cursor:pointer;`), className: "k-h3" },
                  h("span", { style: sty(`font-size:15px;`), className: "msym" },
                    "play_arrow"
                  ),
                  "Run it"
                )
              ),
              h("div", { style: sty(`margin-top:10px; display:flex; flex-direction:column; gap:5px;`) },
                A(v.simSteps).map(($p, $p$i) => R($p$i, h("div", { style: sty(`display:flex; align-items:flex-start; gap:9px; animation:m3Slide .3s cubic-bezier(.2,0,0,1) both;`) },
                    h("span", { style: sty(`font-size:15px; color:${S($p.colour)}; flex:0 0 auto; margin-top:1px;`), className: "msym" },
                      S($p.icon)
                    ),
                    h("span", { style: sty(`flex:1; font-family:'Roboto Mono',monospace; font-size:11.5px; color:${S($p.colour)}; line-height:1.55;`) },
                      S($p.text)
                    )
                  )))
              ),
              h("div", { style: sty(`margin-top:11px; padding-top:10px; border-top:1px solid #1B211C; display:flex; align-items:center; gap:9px;`) },
                h("span", { style: sty(`font-size:16px; color:${S(v.simVerdictColour)};`), className: "msym" },
                  S(v.simVerdictIcon)
                ),
                h("span", { style: sty(`flex:1; font-size:12px; color:${S(v.simVerdictColour)}; line-height:1.5;`) },
                  S(v.simVerdict)
                )
              ),
              h("div", { style: sty(`margin-top:11px; background:#141A15; border-radius:10px; padding:10px 12px;`) },
                h("div", { style: sty(`font-size:10.5px; letter-spacing:.8px; text-transform:uppercase; color:#8FA394; margin-bottom:5px;`) },
                  "Wire result"
                ),
                h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#9FF7C4; line-height:1.6; white-space:pre-wrap;`) },
                  S(v.simWire)
                )
              )
            ) : null),
          h("div", { style: sty(`display:flex; gap:8px; margin-top:14px;`) },
            h("button", { onClick: fn(v.closeInfo), style: sty(`flex:1; background:#82D9A5; border:0; border-radius:999px; padding:10px 0; color:#00391F; font:inherit; font-size:13px; font-weight:500; cursor:pointer;`) },
              "Got it"
            ),
            h("button", { onClick: fn(v.openWizard), style: sty(`flex:1; background:transparent; border:1px solid #414942; border-radius:999px; padding:10px 0; color:#C4CBC2; font:inherit; font-size:13px; cursor:pointer;`), className: "k-h10" },
              "Walk me through it"
            )
          )
        )
      ) : null),
      (v.wizardOpen ? h("div", { style: sty(`position:absolute; ${S(v.wizardChrome)} max-height:100vh; background:#141A15; box-shadow:-8px 0 32px rgba(0,0,0,.5); z-index:55; display:flex; flex-direction:column;`) },
          h("div", { onMouseDown: fn(v.dragWizard), style: sty(`padding:16px 20px 12px; display:flex; align-items:flex-start; gap:10px; cursor:grab;`) },
            h("span", { style: sty(`font-size:18px; color:#778078; margin-top:4px;`), className: "msym" },
              "drag_indicator"
            ),
            h("div", { style: sty(`flex:1; min-width:0;`) },
              h("div", { style: sty(`font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#8FA394;`) },
                "Guided wizard"
              ),
              h("div", { style: sty(`font-size:17px; font-weight:500; margin-top:4px;`) },
                S(v.wizardTitle)
              )
            ),
            h("div", { style: sty(`display:flex; gap:3px; flex:0 0 auto;`) },
              A(v.wizardDockOpts).map(($d, $d$i) => R($d$i, F(
                ($d.on ? h("button", { onClick: fn($d.pick), title: $d.label, style: sty(`width:26px; height:26px; border-radius:7px; background:#005230; border:0; color:#9FF7C4; cursor:pointer;`) },
                    h("span", { style: sty(`font-size:15px;`), className: "msym" },
                      S($d.icon)
                    )
                  ) : null),
                ($d.off ? h("button", { onClick: fn($d.pick), title: $d.label, style: sty(`width:26px; height:26px; border-radius:7px; background:transparent; border:0; color:#778078; cursor:pointer;`), className: "k-h31" },
                    h("span", { style: sty(`font-size:15px;`), className: "msym" },
                      S($d.icon)
                    )
                  ) : null)
              )))
            ),
            h("button", { onClick: fn(v.closeWizard), style: sty(`width:32px; height:32px; border-radius:50%; background:transparent; border:0; color:#C4CBC2; cursor:pointer; flex:0 0 auto;`), className: "k-h1" },
              h("span", { style: sty(`font-size:19px;`), className: "msym" },
                "close"
              )
            )
          ),
          h("div", { style: sty(`padding:0 20px 12px; display:flex; gap:6px;`) },
            A(v.wizardSteps).map(($s, $s$i) => R($s$i, h("div", { style: sty(`flex:1; height:4px; border-radius:2px; background:${S($s.bg)};`) })))
          ),
          h("div", { style: sty(`padding:0 14px 10px; display:flex; gap:4px; overflow-x:auto;`) },
            A(v.wizardRail).map(($w, $w$i) => R($w$i, F(
              ($w.current ? h("button", { onClick: fn($w.go), style: sty(`display:flex; align-items:center; gap:6px; background:#005230; border:0; border-radius:999px; padding:6px 12px; color:#9FF7C4; font:inherit; font-size:11.5px; font-weight:500; cursor:pointer; white-space:nowrap;`) },
                  h("span", { style: sty(`width:16px; height:16px; border-radius:50%; background:#9FF7C4; color:#00391F; font-size:10px; display:flex; align-items:center; justify-content:center;`) },
                    S($w.num)
                  ),
                  S($w.label)
                ) : null),
              ($w.done ? h("button", { onClick: fn($w.go), style: sty(`display:flex; align-items:center; gap:6px; background:transparent; border:0; border-radius:999px; padding:6px 12px; color:#82D9A5; font:inherit; font-size:11.5px; cursor:pointer; white-space:nowrap;`), className: "k-h10" },
                  h("span", { style: sty(`font-size:15px;`), className: "msym" },
                    "check_circle"
                  ),
                  S($w.label)
                ) : null),
              ($w.todo ? h("button", { onClick: fn($w.go), style: sty(`display:flex; align-items:center; gap:6px; background:transparent; border:0; border-radius:999px; padding:6px 12px; color:#778078; font:inherit; font-size:11.5px; cursor:pointer; white-space:nowrap;`), className: "k-h10" },
                  h("span", { style: sty(`width:16px; height:16px; border-radius:50%; border:1px solid #414942; font-size:10px; display:flex; align-items:center; justify-content:center;`) },
                    S($w.num)
                  ),
                  S($w.label)
                ) : null)
            )))
          ),
          h("div", { style: sty(`flex:1; overflow-y:auto; padding:6px 20px 20px;`) },
            h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#8FA394; margin-bottom:6px;`) },
              S(v.wizardCounter)
            ),
            h("div", { style: sty(`font-size:17px; font-weight:500; margin-bottom:6px;`) },
              S(v.wizardStepTitle)
            ),
            h("div", { style: sty(`font-size:13px; color:#9AA39B; line-height:1.6; margin-bottom:14px; text-wrap:pretty;`) },
              S(v.wizardStepBody)
            ),
            h("div", { style: sty(`background:#1B211C; border-radius:12px; padding:13px 15px; margin-bottom:18px; display:flex; gap:10px;`) },
              h("span", { style: sty(`font-size:18px; color:#82D9A5; flex:0 0 auto;`), className: "msym" },
                "lightbulb"
              ),
              h("div", null,
                h("div", { style: sty(`font-size:11px; letter-spacing:.7px; text-transform:uppercase; color:#8FA394; margin-bottom:5px;`) },
                  "Why this matters"
                ),
                h("div", { style: sty(`font-size:12.5px; color:#C4CBC2; line-height:1.6; text-wrap:pretty;`) },
                  S(v.wizardWhy)
                )
              )
            ),
            (v.hasWarn ? h("div", { style: sty(`background:#4A1F1B; border-radius:12px; padding:12px 15px; margin-bottom:18px; display:flex; gap:10px; align-items:flex-start;`) },
                h("span", { style: sty(`font-size:18px; color:#FFB4AB; flex:0 0 auto;`), className: "msym" },
                  "warning"
                ),
                h("div", { style: sty(`font-size:12.5px; color:#FFDAD6; line-height:1.6;`) },
                  S(v.wizardWarn)
                )
              ) : null),
            h("div", { style: sty(`display:flex; flex-direction:column; gap:16px;`) },
              A(v.wizardCtls).map(($c, $c$i) => R($c$i, h(M3Control, { ctl: $c })))
            ),
            h("div", { style: sty(`margin-top:20px; background:#1B211C; border-radius:12px; padding:14px;`) },
              h("div", { style: sty(`font-size:11px; letter-spacing:.8px; text-transform:uppercase; color:#8FA394; margin-bottom:8px;`) },
                "What this writes"
              ),
              h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12px; color:#9FF7C4; line-height:1.7; white-space:pre-wrap;`) },
                S(v.wizardPreview)
              )
            )
          ),
          h("div", { style: sty(`padding:14px 20px; display:flex; gap:10px; border-top:1px solid #262B26;`) },
            h("button", { onClick: fn(v.wizardBack), style: sty(`background:transparent; border:1px solid #414942; border-radius:999px; padding:10px 20px; color:#C4CBC2; font:inherit; font-size:13px; cursor:pointer;`), className: "k-h10" },
              "Back"
            ),
            h("div", { style: sty(`flex:1;`) }),
            h("button", { onClick: fn(v.wizardNext), style: sty(`background:#82D9A5; border:0; border-radius:999px; padding:10px 24px; color:#00391F; font:inherit; font-size:13px; font-weight:500; cursor:pointer;`), className: "k-h12" },
              S(v.wizardNextLabel)
            )
          )
        ) : null),
      (v.paletteOpen ? F(
        h("div", { onClick: fn(v.togglePalette), style: sty(`position:absolute; inset:0; background:rgba(0,0,0,.5); z-index:70;`) }),
        h("div", { style: sty(`position:absolute; left:50%; top:88px; transform:translateX(-50%); width:620px; background:#252B25; border-radius:20px; box-shadow:0 12px 40px rgba(0,0,0,.6); z-index:71; overflow:hidden; animation:dlgPalette .22s cubic-bezier(.2,0,0,1);`) },
          h("div", { style: sty(`display:flex; align-items:center; gap:12px; padding:16px 20px; border-bottom:1px solid #333B34;`) },
            h("span", { style: sty(`font-size:22px; color:#82D9A5;`), className: "msym" },
              "search"
            ),
            h("span", { style: sty(`font-size:15px; color:#9AA39B;`) },
              "Jump to any screen, setting, or command"
            ),
            h("div", { style: sty(`flex:1;`) }),
            h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#778078;`) },
              "Ctrl ⇧ F"
            )
          ),
          h("div", { style: sty(`max-height:420px; overflow-y:auto; padding:8px;`) },
            A(v.paletteItems).map(($p, $p$i) => R($p$i, h("button", { onClick: fn($p.go), style: sty(`width:100%; text-align:left; display:flex; align-items:center; gap:12px; background:transparent; border:0; border-radius:12px; padding:11px 14px; cursor:pointer;`), className: "k-h32" },
                h("span", { style: sty(`font-size:19px; color:#82D9A5;`), className: "msym" },
                  S($p.icon)
                ),
                h("span", { style: sty(`flex:1; font-size:13.5px; color:#DFE4DC;`) },
                  S($p.label)
                ),
                h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#8FA394;`) },
                  S($p.hint)
                )
              )))
          )
        )
      ) : null),
      (v.ceremonyOpen ? h("div", { style: sty(`position:absolute; inset:0; background:rgba(0,0,0,.66); z-index:80; display:flex; align-items:center; justify-content:center;`) },
          h("div", { style: sty(`width:660px; max-height:88vh; overflow-y:auto; background:#252B25; border-radius:28px; padding:26px 28px; box-shadow:0 16px 48px rgba(0,0,0,.7); animation:dlgCeremony .3s cubic-bezier(.2,0,0,1);`) },
            h("div", { style: sty(`display:flex; align-items:center; gap:12px;`) },
              h("span", { style: sty(`font-size:26px; color:#FFB4AB;`), className: "msym" },
                "gpp_maybe"
              ),
              h("div", { style: sty(`flex:1;`) },
                h("div", { style: sty(`font-size:19px; font-weight:500;`) },
                  S(v.ceremonyTitle)
                ),
                h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12px; color:#9AA39B; margin-top:3px;`) },
                  S(v.ceremonyCmd)
                )
              ),
              h("button", { onClick: fn(v.cancelCeremony), style: sty(`width:36px; height:36px; border-radius:50%; background:transparent; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h32" },
                h("span", { style: sty(`font-size:20px;`), className: "msym" },
                  "close"
                )
              )
            ),
            (v.canSkip ? h("button", { onClick: fn(v.skipCeremony), style: sty(`width:100%; margin-top:16px; display:flex; align-items:center; gap:10px; background:#1B4D33; border:0; border-radius:14px; padding:13px 16px; color:#9FF7C4; font:inherit; font-size:13px; cursor:pointer; text-align:left;`), className: "k-h3" },
                h("span", { style: sty(`font-size:20px;`), className: "msym" },
                  "confirmation_number"
                ),
                h("span", { style: sty(`flex:1;`) },
                  "Spend 1 confirmation credit and skip all four gates"
                ),
                h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12px;`) },
                  `${S(v.credits)} left`
                )
              ) : null),
            h("div", { style: sty(`display:flex; gap:8px; margin:18px 0 20px;`) },
              A(v.ceremonySteps).map(($s, $s$i) => R($s$i, h("div", { style: sty(`flex:1; display:flex; flex-direction:column; gap:6px;`) },
                  h("div", { style: sty(`height:4px; border-radius:2px; background:${S($s.bg)};`) }),
                  h("span", { style: sty(`font-size:11px; color:${S($s.fg)};`) },
                    S($s.label)
                  )
                )))
            ),
            (v.cKey ? h("div", { style: sty(`text-align:center; padding:10px 0 4px;`) },
                h("div", { style: sty(`font-size:15px; font-weight:500; margin-bottom:6px;`) },
                  "Step 1 · Turn the operator key"
                ),
                h("div", { style: sty(`font-size:13px; color:#9AA39B; line-height:1.6; max-width:52ch; margin:0 auto 20px;`) },
                  "Click and hold the key to rotate it a quarter turn. This proves a human, not a script, is asking for a production change."
                ),
                h("button", { onClick: fn(v.turnKey), style: sty(`margin:0 auto; width:150px; height:150px; border-radius:50%; background:#1B211C; border:3px solid #414942; cursor:pointer; display:flex; align-items:center; justify-content:center; transform:rotate(${S(v.keyAngle)});`), className: "k-h17" },
                  h("span", { style: sty(`font-size:60px; color:#82D9A5;`), className: "msym" },
                    "key_vertical"
                  )
                ),
                h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12px; color:#8FA394; margin-top:14px;`) },
                  S(v.keyStatus)
                )
              ) : null),
            (v.cSwitch ? h("div", { style: sty(`text-align:center; padding:10px 0 4px;`) },
                h("div", { style: sty(`font-size:15px; font-weight:500; margin-bottom:6px;`) },
                  "Step 2 · Hold the arming switch"
                ),
                h("div", { style: sty(`font-size:13px; color:#9AA39B; line-height:1.6; max-width:52ch; margin:0 auto 20px;`) },
                  "Press and keep holding for two seconds. Release early and the arm resets."
                ),
                h("button", { onMouseDown: fn(v.holdStart), onMouseUp: fn(v.holdEnd), onMouseLeave: fn(v.holdEnd), style: sty(`margin:0 auto; width:210px; height:74px; border-radius:20px; background:#1B211C; border:3px solid #414942; cursor:pointer; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; gap:10px;`) },
                  h("div", { style: sty(`position:absolute; left:0; top:0; bottom:0; width:${S(v.holdPct)}; background:#1B4D33;`) }),
                  h("span", { style: sty(`font-size:26px; color:#82D9A5; position:relative;`), className: "msym" },
                    "touch_app"
                  ),
                  h("span", { style: sty(`font-size:14px; font-weight:500; color:#DFE4DC; position:relative;`) },
                    "Hold to arm"
                  )
                ),
                h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12px; color:#8FA394; margin-top:14px;`) },
                  S(v.holdStatus)
                )
              ) : null),
            (v.cSlide ? h("div", { style: sty(`padding:10px 4px 4px;`) },
                h("div", { style: sty(`font-size:15px; font-weight:500; margin-bottom:6px; text-align:center;`) },
                  "Step 3 · Slide to the far end"
                ),
                h("div", { style: sty(`font-size:13px; color:#9AA39B; line-height:1.6; max-width:52ch; margin:0 auto 24px; text-align:center;`) },
                  "Drag the handle all the way right. Let go before the end and it springs back."
                ),
                h("div", { style: sty(`background:#1B211C; border-radius:999px; padding:8px 14px;`) },
                  h("input", { type: `range`, min: `0`, max: `100`, value: v.slideVal, onChange: fn(v.onSlide), onInput: fn(v.onSlide), style: sty(`width:100%; height:28px;`) })
                ),
                h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12px; color:#8FA394; margin-top:14px; text-align:center;`) },
                  S(v.slideStatus)
                )
              ) : null),
            (v.cMole ? h("div", { style: sty(`padding:6px 0 4px;`) },
                h("div", { style: sty(`display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;`) },
                  h("div", null,
                    h("div", { style: sty(`font-size:15px; font-weight:500;`) },
                      "Step 4 · Attention check"
                    ),
                    h("div", { style: sty(`font-size:12.5px; color:#9AA39B; margin-top:3px;`) },
                      "Hit five targets in fifteen seconds. Enterprise change control, verified awake."
                    )
                  ),
                  h("div", { style: sty(`text-align:right;`) },
                    h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:24px; color:#82D9A5;`) },
                      S(v.moleHits)
                    ),
                    h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12px; color:#FFB4AB;`) },
                      S(v.moleTime)
                    )
                  )
                ),
                h("div", { style: sty(`display:grid; grid-template-columns:repeat(4,1fr); gap:8px;`) },
                  A(v.moleCells).map(($m, $m$i) => R($m$i, F(
                    ($m.up ? h("button", { onClick: fn($m.whack), style: sty(`height:74px; border-radius:14px; background:#005230; border:2px solid #82D9A5; cursor:pointer; display:flex; align-items:center; justify-content:center; animation:m3Pop .12s ease-out;`) },
                        h("span", { style: sty(`font-size:32px; color:#9FF7C4;`), className: "msym" },
                          "radio_button_checked"
                        )
                      ) : null),
                    ($m.down ? h("div", { style: sty(`height:74px; border-radius:14px; background:#1B211C; border:2px solid #262B26;`) }) : null)
                  )))
                )
              ) : null),
            (v.cDone ? h("div", { style: sty(`text-align:center; padding:22px 0;`) },
                h("span", { style: sty(`font-size:56px; color:#82D9A5;`), className: "msym" },
                  "verified"
                ),
                h("div", { style: sty(`font-size:17px; font-weight:500; margin-top:12px;`) },
                  "All four gates cleared"
                ),
                h("div", { style: sty(`font-size:13px; color:#9AA39B; margin-top:6px;`) },
                  "The change is signed, attested to the memory ledger, and ready to execute."
                ),
                h("button", { onClick: fn(v.executeCeremony), style: sty(`margin-top:20px; background:#93000A; border:0; border-radius:999px; padding:13px 30px; color:#fff; font:inherit; font-size:14px; font-weight:500; cursor:pointer;`), className: "k-h18" },
                  "Execute now"
                )
              ) : null)
          )
        ) : null),
      (v.onboardOpen ? h("div", { style: sty(`position:absolute; inset:0; background:#0B0F0C; z-index:90; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; padding:28px 32px 40px; overflow-y:auto; animation:dlgOnboard .4s ease-out;`) },
          h("div", { style: sty(`width:760px; max-width:100%; margin:auto 0;`) },
            h("div", { style: sty(`display:flex; gap:8px; margin-bottom:26px;`) },
              A(v.onboardSteps).map(($s, $s$i) => R($s$i, h("div", { style: sty(`flex:1; display:flex; flex-direction:column; gap:7px;`) },
                  h("div", { style: sty(`height:4px; border-radius:2px; background:${S($s.bg)};`) }),
                  h("span", { style: sty(`font-size:11px; color:${S($s.fg)};`) },
                    S($s.label)
                  )
                )))
            ),
            (v.onboardFirst ? h("div", { style: sty(`position:relative; height:196px; margin-bottom:22px; border-radius:24px; overflow:hidden; background:radial-gradient(120% 160% at 20% 10%, #14402A 0%, #0C110D 62%);`) },
                h("span", { style: sty(`position:absolute; left:8%; top:22%; width:132px; height:132px; border-radius:50%; background:radial-gradient(circle at 34% 30%, #2E7D57, #0E2B1D); box-shadow:0 0 60px rgba(130,217,165,.35); animation:m3Float 7s ease-in-out infinite;`) }),
                h("span", { style: sty(`position:absolute; left:8%; top:22%; width:132px; height:132px; border-radius:50%; border:2px solid rgba(159,247,196,.35); animation:m3Ripple 3.4s ease-out infinite;`) }),
                h("span", { style: sty(`position:absolute; left:31%; top:14%; width:16px; height:16px; border-radius:50%; background:#9FF7C4; animation:m3Float 4.2s ease-in-out infinite;`) }),
                h("span", { style: sty(`position:absolute; left:48%; top:62%; width:9px; height:9px; border-radius:50%; background:#FFD68A; animation:m3Float 5.6s ease-in-out infinite;`) }),
                h("span", { style: sty(`position:absolute; left:72%; top:26%; width:7px; height:7px; border-radius:50%; background:#DFE4DC; animation:m3Pulse 3s ease-in-out infinite;`) }),
                h("span", { style: sty(`position:absolute; left:88%; top:70%; width:11px; height:11px; border-radius:50%; background:#8AB4F8; animation:m3Float 6.4s ease-in-out infinite;`) }),
                h("span", { style: sty(`position:absolute; left:60%; top:34%; font-size:46px; color:#9FF7C4; animation:m3Wiggle 3.2s ease-in-out infinite;`), className: "msym" },
                  "call"
                ),
                h("span", { style: sty(`position:absolute; left:78%; top:44%; font-size:26px; color:#82D9A5; animation:m3Float 5s ease-in-out infinite;`), className: "msym" },
                  "graphic_eq"
                ),
                h("div", { style: sty(`position:absolute; left:0; right:0; bottom:24px; text-align:center;`) },
                  h("div", { style: sty(`font-size:13px; letter-spacing:3px; text-transform:uppercase; color:#9FF7C4; animation:m3Slide .6s cubic-bezier(.2,0,0,1) both;`) },
                    "Ding PBX Console"
                  ),
                  h("div", { style: sty(`font-size:34px; font-weight:700; color:#DFF3E5; margin-top:6px; text-shadow:0 4px 24px rgba(0,0,0,.6); animation:m3Pop .7s cubic-bezier(.2,1.5,.4,1) both;`) },
                    "Welcome to your first day on earth"
                  ),
                  h("div", { style: sty(`font-size:13.5px; color:#C3EFD5; margin-top:8px; animation:m3Rise .8s ease-out .2s both;`) },
                    "Nothing here assumes you have seen a telephone system before. Everything is a button, and everything explains itself."
                  )
                )
              ) : null),
            h("div", { style: sty(`display:flex; align-items:center; gap:12px; margin-bottom:8px;`) },
              h("span", { style: sty(`font-size:30px; color:#82D9A5; animation:m3Bounce .5s cubic-bezier(.2,1.4,.4,1);`), className: "msym" },
                S(v.onboardIcon)
              ),
              h("h2", { style: sty(`margin:0; font-size:30px; font-weight:400;`) },
                S(v.onboardTitle)
              )
            ),
            h("p", { style: sty(`margin:0 0 24px; font-size:15px; color:#9AA39B; line-height:1.65; max-width:70ch; text-wrap:pretty;`) },
              S(v.onboardBody)
            ),
            h("div", { style: sty(`background:#1B211C; border-radius:20px; padding:22px 24px; display:flex; flex-direction:column; gap:18px;`) },
              A(v.onboardCtls).map(($c, $c$i) => R($c$i, h(M3Control, { ctl: $c })))
            ),
            (v.easyMode ? h("button", { onClick: fn(v.superEasy), style: sty(`display:flex; align-items:center; gap:14px; width:100%; margin-top:18px; background:#9FF7C4; border:0; border-radius:20px; padding:18px 22px; cursor:pointer; text-align:left; animation:m3Glow 2.6s ease-in-out infinite;`), className: "k-h19" },
                h("span", { style: sty(`font-size:34px; color:#00391F;`), className: "msym" },
                  "bolt"
                ),
                h("div", { style: sty(`flex:1;`) },
                  h("div", { style: sty(`font-size:19px; font-weight:700; color:#00391F;`) },
                    "Super easy mode — just build it for me"
                  ),
                  h("div", { style: sty(`font-size:13px; color:#1B4D33; margin-top:3px; line-height:1.5;`) },
                    "Skip every question. Eight extensions, one menu, TLS if a certificate is already on the target, and hardened defaults. Business hours is not set up here — do that afterward in Configure. You can change all of it later, and nothing here is permanent."
                  )
                ),
                h("span", { style: sty(`font-size:26px; color:#00391F;`), className: "msym" },
                  "arrow_forward"
                )
              ) : null),
            (v.notEasy ? h("div", { style: sty(`display:flex; align-items:center; gap:14px; width:100%; margin-top:18px; background:#1B2A21; border:1px solid #2F4438; border-radius:20px; padding:18px 22px; text-align:left;`) },
                h("span", { style: sty(`font-size:34px; color:#9FF7C4;`), className: "msym" },
                  "checklist"
                ),
                h("div", { style: sty(`flex:1;`) },
                  h("div", { style: sty(`font-size:19px; font-weight:700; color:#D6EDDD;`) },
                    S(v.modeTitle)
                  ),
                  h("div", { style: sty(`font-size:13px; color:#9AA39B; margin-top:3px; line-height:1.5;`) },
                    S(v.modeBody)
                  )
                )
              ) : null),
            h("div", { style: sty(`display:flex; align-items:center; gap:12px; margin-top:20px;`) },
              h("button", { onClick: fn(v.skipOnboard), style: sty(`background:transparent; border:0; color:#9AA39B; font:inherit; font-size:13px; cursor:pointer; padding:12px 14px; border-radius:999px; white-space:nowrap; flex:0 0 auto;`), className: "k-h10" },
                "Skip setup"
              ),
              h("div", { style: sty(`flex:1;`) }),
              h("button", { onClick: fn(v.onboardBack), style: sty(`background:transparent; border:1px solid #414942; border-radius:999px; padding:12px 24px; color:#C4CBC2; font:inherit; font-size:14px; cursor:pointer;`), className: "k-h10" },
                "Back"
              ),
              h("button", { onClick: fn(v.onboardNext), style: sty(`background:#82D9A5; border:0; border-radius:999px; padding:12px 30px; color:#00391F; font:inherit; font-size:14px; font-weight:500; cursor:pointer;`), className: "k-h12" },
                S(v.onboardNextLabel)
              )
            )
          )
        ) : null),
      (v.tourOpen ? h("div", { style: sty(`position:absolute; left:${S(v.tourX)}; top:${S(v.tourY)}; width:320px; background:#005230; border-radius:16px; padding:16px 18px; box-shadow:0 8px 28px rgba(0,0,0,.6); z-index:75; animation:dlgSure .3s cubic-bezier(.2,1.2,.3,1);`) },
          h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#9FF7C4;`) },
            S(v.tourCount)
          ),
          h("div", { style: sty(`font-size:15px; font-weight:500; margin:6px 0 6px; color:#DFF3E5;`) },
            S(v.tourTitle)
          ),
          h("div", { style: sty(`font-size:13px; color:#C3EFD5; line-height:1.6;`) },
            S(v.tourBody)
          ),
          h("div", { style: sty(`display:flex; gap:8px; margin-top:14px;`) },
            h("button", { onClick: fn(v.endTour), style: sty(`background:transparent; border:0; color:#9FF7C4; font:inherit; font-size:12.5px; cursor:pointer; padding:8px 12px; border-radius:999px;`) },
              "End tour"
            ),
            h("div", { style: sty(`flex:1;`) }),
            h("button", { onClick: fn(v.tourNext), style: sty(`background:#9FF7C4; border:0; border-radius:999px; padding:9px 20px; color:#00391F; font:inherit; font-size:12.5px; font-weight:500; cursor:pointer;`) },
              "Next"
            )
          )
        ) : null),
      (v.regexOpen ? F(
        h("div", { onClick: fn(v.closeRegex), style: sty(`position:absolute; inset:0; background:rgba(0,0,0,.3); z-index:96;`) }),
        h("div", { style: sty(`position:absolute; ${S(v.regexChrome)} max-height:86vh; overflow-y:auto; background:#252B25; padding:18px 20px; box-shadow:0 10px 32px rgba(0,0,0,.6); z-index:97;`) },
          h("div", { onMouseDown: fn(v.dragRegex), style: sty(`display:flex; align-items:center; gap:9px; margin:-18px -20px 4px; padding:16px 20px 10px; cursor:grab;`) },
            h("span", { style: sty(`font-size:18px; color:#778078;`), className: "msym" },
              "drag_indicator"
            ),
            h("span", { style: sty(`font-size:20px; color:#82D9A5;`), className: "msym" },
              "data_object"
            ),
            h("span", { style: sty(`font-size:16px; font-weight:500;`) },
              "Regex builder"
            ),
            h("div", { style: sty(`flex:1;`) }),
            A(v.regexDockOpts).map(($d, $d$i) => R($d$i, F(
              ($d.on ? h("button", { onClick: fn($d.pick), title: $d.label, style: sty(`width:26px; height:26px; border-radius:7px; background:#005230; border:0; color:#9FF7C4; cursor:pointer;`) },
                  h("span", { style: sty(`font-size:15px;`), className: "msym" },
                    S($d.icon)
                  )
                ) : null),
              ($d.off ? h("button", { onClick: fn($d.pick), title: $d.label, style: sty(`width:26px; height:26px; border-radius:7px; background:transparent; border:0; color:#778078; cursor:pointer;`), className: "k-h30" },
                  h("span", { style: sty(`font-size:15px;`), className: "msym" },
                    S($d.icon)
                  )
                ) : null)
            ))),
            h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#9FF7C4;`) },
              S(v.regexTargetLabel)
            )
          ),
          h("div", { style: sty(`font-size:12.5px; color:#9AA39B; line-height:1.55; margin-bottom:14px;`) },
            "Tap pieces to build the pattern. Each piece says what it does in plain words, and the preview underneath shows exactly what it matches right now."
          ),
          h("div", { style: sty(`display:flex; align-items:center; gap:8px; background:#0C110D; border:1px solid #333B34; border-radius:12px; padding:10px 12px;`) },
            h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:15px; color:#8FA394;`) },
              "/"
            ),
            h("input", { type: `text`, value: v.rxText, onChange: fn(v.onRxText), onInput: fn(v.onRxText), placeholder: `type a pattern, or tap the pieces below`, spellCheck: `false`, style: sty(`flex:1; background:transparent; border:0; outline:none; color:#9FF7C4; font-family:'Roboto Mono',monospace; font-size:15px;`) }),
            h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:15px; color:#8FA394;`) },
              `/${S(v.regexFlagStr)}`
            ),
            h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:${S(v.regexValidColor)};`) },
              S(v.regexValid)
            )
          ),
          h("div", { style: sty(`display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;`) },
            A(v.rxTools).map(($t, $t$i) => R($t$i, h("button", { onClick: fn($t.run), title: $t.title, style: sty(`display:flex; align-items:center; gap:5px; background:#1B211C; border:1px solid #414942; border-radius:8px; padding:5px 10px; color:#C4CBC2; font:inherit; font-size:11.5px; cursor:pointer;`), className: "k-h26" },
                h("span", { style: sty(`font-size:14px;`), className: "msym" },
                  S($t.icon)
                ),
                S($t.label)
              )))
          ),
          h("div", { style: sty(`margin-top:10px; background:#141A15; border-radius:10px; padding:10px 12px;`) },
            h("div", { style: sty(`font-size:11px; letter-spacing:.8px; text-transform:uppercase; color:#8FA394; margin-bottom:6px;`) },
              "In plain words"
            ),
            h("div", { style: sty(`font-size:12.5px; color:#C4CBC2; line-height:1.55;`) },
              S(v.regexExplain)
            )
          ),
          h("div", { style: sty(`display:flex; flex-wrap:wrap; gap:6px; margin-top:10px;`) },
            A(v.regexChips).map(($t, $t$i) => R($t$i, h("button", { onClick: fn($t.remove), style: sty(`display:flex; align-items:center; gap:6px; background:#005230; border:0; border-radius:8px; padding:6px 9px 6px 12px; color:#9FF7C4; font-family:'Roboto Mono',monospace; font-size:12px; cursor:pointer;`) },
                S($t.label),
                h("span", { style: sty(`font-size:14px;`), className: "msym" },
                  "close"
                )
              )))
          ),
          A(v.regexGroups).map(($g, $g$i) => R($g$i, h("div", { style: sty(`margin-top:14px;`) },
              h("div", { style: sty(`font-size:11px; letter-spacing:.8px; text-transform:uppercase; color:#8FA394; margin-bottom:7px;`) },
                S($g.title)
              ),
              h("div", { style: sty(`display:flex; flex-wrap:wrap; gap:6px;`) },
                A($g.items).map(($i, $i$i) => R($i$i, h("button", { onClick: fn($i.add), style: sty(`display:flex; flex-direction:column; align-items:flex-start; gap:2px; background:#1B211C; border:1px solid #414942; border-radius:10px; padding:7px 11px; cursor:pointer;`), className: "k-h17" },
                    h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12px; color:#9FF7C4;`) },
                      S($i.token)
                    ),
                    h("span", { style: sty(`font-size:10.5px; color:#9AA39B;`) },
                      S($i.label)
                    )
                  )))
              )
            ))),
          h("div", { style: sty(`margin-top:14px; display:flex; flex-wrap:wrap; gap:6px;`) },
            A(v.regexFlags).map(($f, $f$i) => R($f$i, F(
              ($f.on ? h("button", { onClick: fn($f.toggle), style: sty(`display:flex; align-items:center; gap:5px; background:#1B4D33; border:0; border-radius:8px; padding:6px 12px; color:#9FF7C4; font:inherit; font-size:12px; font-weight:500; cursor:pointer;`) },
                  h("span", { style: sty(`font-size:14px;`), className: "msym" },
                    "check"
                  ),
                  S($f.label)
                ) : null),
              ($f.off ? h("button", { onClick: fn($f.toggle), style: sty(`background:transparent; border:1px solid #414942; border-radius:8px; padding:6px 12px; color:#9AA39B; font:inherit; font-size:12px; cursor:pointer;`), className: "k-h15" },
                  S($f.label)
                ) : null)
            )))
          ),
          h("div", { style: sty(`margin-top:14px; background:#141A15; border-radius:12px; padding:12px 14px;`) },
            h("div", { style: sty(`display:flex; justify-content:space-between; font-size:11px; letter-spacing:.8px; text-transform:uppercase; color:#8FA394; margin-bottom:8px;`) },
              h("span", null,
                "Live matches"
              ),
              h("span", { style: sty(`color:#82D9A5;`) },
                S(v.regexCount)
              )
            ),
            A(v.regexPreview).map(($p, $p$i) => R($p$i, h("div", { style: sty(`display:flex; align-items:center; gap:8px; padding:4px 0;`) },
                h("span", { style: sty(`font-size:15px; color:${S($p.color)};`), className: "msym" },
                  S($p.icon)
                ),
                h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12px; color:${S($p.color)};`) },
                  S($p.text)
                )
              )))
          ),
          h("div", { style: sty(`display:flex; gap:8px; margin-top:16px;`) },
            h("button", { onClick: fn(v.clearRegex), style: sty(`background:transparent; border:1px solid #414942; border-radius:999px; padding:10px 18px; color:#C4CBC2; font:inherit; font-size:13px; cursor:pointer;`) },
              "Clear"
            ),
            h("div", { style: sty(`flex:1;`) }),
            h("button", { onClick: fn(v.closeRegex), style: sty(`background:#82D9A5; border:0; border-radius:999px; padding:10px 24px; color:#00391F; font:inherit; font-size:13px; font-weight:500; cursor:pointer;`) },
              "Apply filter"
            )
          )
        )
      ) : null),
      (v.ctxOpen ? F(
        h("div", { onClick: fn(v.closeCtx), onContextMenu: fn(v.closeCtx), style: sty(`position:absolute; inset:0; z-index:78;`) }),
        h("div", { style: sty(`position:absolute; left:${S(v.ctxX)}; top:${S(v.ctxY)}; width:274px; background:#252B25; border-radius:14px; padding:6px; box-shadow:0 10px 30px rgba(0,0,0,.6); z-index:79; animation:dlgCtx .14s cubic-bezier(.2,1.3,.4,1);`) },
          h("div", { style: sty(`padding:8px 12px 6px; font-family:'Roboto Mono',monospace; font-size:10.5px; color:#8FA394; border-bottom:1px solid #333B34; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
            S(v.ctxTarget)
          ),
          A(v.ctxItems).map(($i, $i$i) => R($i$i, h("button", { onClick: fn($i.act), onMouseEnter: fn($i.hover), style: sty(`width:100%; display:flex; align-items:center; gap:11px; background:${S($i.bg)}; border:0; border-radius:9px; padding:9px 12px; color:#DFE4DC; font:inherit; font-size:13px; cursor:pointer; text-align:left;`), className: "k-h32" },
              h("span", { style: sty(`font-size:18px; color:#82D9A5;`), className: "msym" },
                S($i.icon)
              ),
              h("span", { style: sty(`flex:1;`) },
                S($i.label)
              ),
              h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:10.5px; color:#778078;`) },
                S($i.hint)
              )
            )))
        ),
        (v.subOpen ? h("div", { style: sty(`position:absolute; left:${S(v.subX)}; top:${S(v.subY)}; width:230px; background:#252B25; border-radius:14px; padding:6px; box-shadow:0 10px 30px rgba(0,0,0,.6); z-index:80; animation:dlgCtx .13s cubic-bezier(.2,1.3,.4,1);`) },
            A(v.subItems).map(($i, $i$i) => R($i$i, h("button", { onClick: fn($i.run), style: sty(`width:100%; display:flex; align-items:center; gap:11px; background:transparent; border:0; border-radius:9px; padding:9px 12px; color:#DFE4DC; font:inherit; font-size:13px; cursor:pointer; text-align:left;`), className: "k-h32" },
                h("span", { style: sty(`font-size:18px; color:#82D9A5;`), className: "msym" },
                  S($i.icon)
                ),
                h("span", { style: sty(`flex:1;`) },
                  S($i.label)
                )
              )))
          ) : null)
      ) : null),
      (v.lockOpen ? h("div", { style: sty(`position:absolute; ${S(v.lockChrome)} max-height:88vh; overflow-y:auto; background:#252B25; padding:18px 20px; box-shadow:0 10px 32px rgba(0,0,0,.6); z-index:82;`) },
          h("div", { onMouseDown: fn(v.dragLock), style: sty(`display:flex; align-items:center; gap:9px; cursor:grab; margin:-18px -20px 0; padding:16px 20px 8px;`) },
            h("span", { style: sty(`font-size:18px; color:#778078;`), className: "msym" },
              "drag_indicator"
            ),
            h("span", { style: sty(`font-size:20px; color:#82D9A5;`), className: "msym" },
              "lock"
            ),
            h("span", { style: sty(`font-size:16px; font-weight:500;`) },
              "Lock this element"
            ),
            h("div", { style: sty(`flex:1;`) }),
            A(v.lockDockOpts).map(($d, $d$i) => R($d$i, F(
              ($d.on ? h("button", { onClick: fn($d.pick), title: $d.label, style: sty(`width:26px; height:26px; border-radius:7px; background:#005230; border:0; color:#9FF7C4; cursor:pointer;`) },
                  h("span", { style: sty(`font-size:15px;`), className: "msym" },
                    S($d.icon)
                  )
                ) : null),
              ($d.off ? h("button", { onClick: fn($d.pick), title: $d.label, style: sty(`width:26px; height:26px; border-radius:7px; background:transparent; border:0; color:#778078; cursor:pointer;`), className: "k-h30" },
                  h("span", { style: sty(`font-size:15px;`), className: "msym" },
                    S($d.icon)
                  )
                ) : null)
            ))),
            h("div", { style: sty(`flex:1;`) }),
            h("button", { onClick: fn(v.closeLock), style: sty(`width:30px; height:30px; border-radius:50%; background:transparent; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h32" },
              h("span", { style: sty(`font-size:18px;`), className: "msym" },
                "close"
              )
            )
          ),
          h("div", { style: sty(`margin-top:8px; font-family:'Roboto Mono',monospace; font-size:11.5px; color:#9FF7C4; background:#141A15; border-radius:8px; padding:8px 12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
            S(v.lockTarget)
          ),
          h("div", { style: sty(`display:flex; gap:5px; margin:14px 0;`) },
            A(v.lockSteps).map(($s, $s$i) => R($s$i, h("div", { style: sty(`flex:1; height:4px; border-radius:2px; background:${S($s.bg)};`) })))
          ),
          h("div", { style: sty(`font-size:14.5px; font-weight:500; margin-bottom:5px;`) },
            S(v.lockStepTitle)
          ),
          h("div", { style: sty(`font-size:12.5px; color:#9AA39B; line-height:1.6; margin-bottom:14px;`) },
            S(v.lockStepBody)
          ),
          (v.lockPickMethod ? h("div", { style: sty(`display:flex; flex-direction:column; gap:6px;`) },
              A(v.lockMethods).map(($m, $m$i) => R($m$i, F(
                ($m.on ? h("button", { onClick: fn($m.pick), style: sty(`display:flex; align-items:center; gap:10px; background:#005230; border:0; border-radius:12px; padding:12px 14px; color:#9FF7C4; font:inherit; font-size:13px; font-weight:500; cursor:pointer; text-align:left;`) },
                    h("span", { style: sty(`font-size:19px;`), className: "msym" },
                      S($m.icon)
                    ),
                    h("span", { style: sty(`flex:1;`) },
                      S($m.label)
                    ),
                    h("span", { style: sty(`font-size:18px;`), className: "msym" },
                      "radio_button_checked"
                    )
                  ) : null),
                ($m.off ? h("button", { onClick: fn($m.pick), style: sty(`display:flex; align-items:center; gap:10px; background:transparent; border:1px solid #414942; border-radius:12px; padding:12px 14px; color:#C4CBC2; font:inherit; font-size:13px; cursor:pointer; text-align:left;`), className: "k-h10" },
                    h("span", { style: sty(`font-size:19px; color:#9AA39B;`), className: "msym" },
                      S($m.icon)
                    ),
                    h("span", { style: sty(`flex:1;`) },
                      S($m.label)
                    ),
                    h("span", { style: sty(`font-size:18px; color:#778078;`), className: "msym" },
                      "radio_button_unchecked"
                    )
                  ) : null)
              )))
            ) : null),
          (v.lockPin ? h("div", { style: sty(`border-radius:16px; background:#0C110D; border:1px solid #333B34; padding:14px; box-shadow:inset 0 2px 10px rgba(0,0,0,.5);`) },
              h("div", { style: sty(`display:flex; align-items:center; gap:8px; margin-bottom:10px;`) },
                h("span", { style: sty(`width:8px; height:8px; border-radius:50%; background:#82D9A5; animation:m3Pulse 1.6s infinite;`) }),
                h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:10.5px; letter-spacing:1.4px; color:#8FA394; text-transform:uppercase;`) },
                  "Access control · enrol PIN"
                )
              ),
              h("div", { style: sty(`background:#141A15; border:1px solid #333B34; border-radius:10px; padding:12px; display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:12px;`) },
                A(v.pinDots).map(($d, $d$i) => R($d$i, h("span", { style: sty(`width:15px; height:15px; border-radius:50%; background:${S($d.bg)}; border:2px solid #414942; transition:background .12s;`) })))
              ),
              h("div", { style: sty(`display:grid; grid-template-columns:repeat(3,1fr); gap:7px;`) },
                A(v.pinKeys).map(($k, $k$i) => R($k$i, h("button", { onClick: fn($k.press), style: sty(`height:50px; border-radius:10px; background:linear-gradient(#20281F,#171D18); border:1px solid #414942; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:19px; cursor:pointer; transition:transform .07s, background .12s; box-shadow:0 2px 0 #0C110D;`), className: "k-h21" },
                    S($k.label)
                  )))
              ),
              h("div", { style: sty(`margin-top:12px;`) },
                h("div", { style: sty(`font-size:11px; letter-spacing:.8px; text-transform:uppercase; color:#8FA394; margin-bottom:6px;`) },
                  "Or type it"
                ),
                h("div", { style: sty(`display:flex; align-items:center; gap:8px; background:#141A15; border:1px solid #414942; border-radius:10px; padding:9px 12px;`) },
                  h("span", { style: sty(`font-size:17px; color:#82D9A5;`), className: "msym" },
                    "keyboard"
                  ),
                  h("input", { type: v.pwInputType, value: v.pinValue, onChange: fn(v.onPinInput), onInput: fn(v.onPinInput), inputMode: `numeric`, maxLength: `6`, placeholder: `000000`, style: sty(`flex:1; background:transparent; border:0; outline:none; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:14px; letter-spacing:4px;`) }),
                  h("button", { onClick: fn(v.pinReveal), style: sty(`width:28px; height:28px; border-radius:50%; background:transparent; border:0; color:#9AA39B; cursor:pointer;`), className: "k-h4" },
                    h("span", { style: sty(`font-size:17px;`), className: "msym" },
                      S(v.pinEyeIcon)
                    )
                  )
                )
              )
            ) : null),
          (v.lockPassword ? h("div", { style: sty(`border-radius:16px; background:#0C110D; border:1px solid #333B34; padding:14px;`) },
              h("div", { style: sty(`display:flex; align-items:center; gap:8px; margin-bottom:10px;`) },
                h("span", { style: sty(`width:8px; height:8px; border-radius:50%; background:#82D9A5; animation:m3Pulse 1.6s infinite;`) }),
                h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:10.5px; letter-spacing:1.4px; color:#8FA394; text-transform:uppercase;`) },
                  "Access control · enrol passphrase"
                )
              ),
              h("div", { style: sty(`display:flex; align-items:center; gap:8px; background:#141A15; border:1px solid #414942; border-radius:10px; padding:11px 12px;`) },
                h("span", { style: sty(`font-size:17px; color:#82D9A5;`), className: "msym" },
                  "password"
                ),
                h("input", { type: v.pwInputType, value: v.pwValue, onChange: fn(v.onPwInput), onInput: fn(v.onPwInput), placeholder: `Type a passphrase`, style: sty(`flex:1; background:transparent; border:0; outline:none; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:14px;`) }),
                h("button", { onClick: fn(v.pinReveal), style: sty(`width:28px; height:28px; border-radius:50%; background:transparent; border:0; color:#9AA39B; cursor:pointer;`), className: "k-h4" },
                  h("span", { style: sty(`font-size:17px;`), className: "msym" },
                    S(v.pinEyeIcon)
                  )
                )
              ),
              h("div", { style: sty(`display:flex; gap:6px; flex-wrap:wrap; margin-top:10px;`) },
                A(v.pwBuilders).map(($b, $b$i) => R($b$i, h("button", { onClick: fn($b.run), style: sty(`display:flex; align-items:center; gap:5px; background:#1B211C; border:1px solid #414942; border-radius:8px; padding:6px 11px; color:#C4CBC2; font:inherit; font-size:11.5px; cursor:pointer;`), className: "k-h26" },
                    h("span", { style: sty(`font-size:14px;`), className: "msym" },
                      S($b.icon)
                    ),
                    S($b.label)
                  )))
              ),
              h("div", { style: sty(`margin-top:12px; display:flex; align-items:center; gap:10px;`) },
                h("div", { style: sty(`flex:1; height:6px; border-radius:3px; background:#262B26; overflow:hidden;`) },
                  h("div", { style: sty(`height:100%; border-radius:3px; background:${S(v.pwColor)}; width:${S(v.pwPct)};`) })
                ),
                h("span", { style: sty(`font-size:11.5px; color:${S(v.pwColor)};`) },
                  S(v.pwLabel)
                )
              )
            ) : null),
          (v.lockTotp ? F(
            h("div", { style: sty(`display:flex; gap:14px; align-items:center;`) },
              h("div", { style: sty(`width:112px; height:112px; border-radius:12px; background:repeating-conic-gradient(#DFE4DC 0% 25%, #141A15 0% 50%) 50%/14px 14px; flex:0 0 auto;`) }),
              h("div", { style: sty(`font-size:12.5px; color:#9AA39B; line-height:1.6;`) },
                "Scan with the built-in authenticator or any TOTP app. The secret is generated on this machine and never leaves it."
              )
            ),
            h("button", { onClick: fn(v.pairAuth), style: sty(`margin-top:12px; width:100%; background:#262B26; border:0; border-radius:999px; padding:10px 0; color:#9FF7C4; font:inherit; font-size:12.5px; font-weight:500; cursor:pointer;`), className: "k-h11" },
              "Pair the built-in authenticator"
            )
          ) : null),
          (v.lockDuration ? h("div", { style: sty(`display:flex; flex-direction:column; gap:14px;`) },
              A(v.lockCtls).map(($c, $c$i) => R($c$i, h(M3Control, { ctl: $c })))
            ) : null),
          (v.lockConfirm ? h("div", { style: sty(`background:#141A15; border-radius:12px; padding:13px 15px; font-size:12.5px; color:#C4CBC2; line-height:1.65;`) },
              "This is a toy lock. It disables the surface inside this console; it is not encryption and it does not protect the PBX. Lose the credential and you delete ",
              h("span", { style: sty(`font-family:'Roboto Mono',monospace; color:#9FF7C4;`) },
                "%APPDATA%\\DingPbxConsole\\locks"
              ),
              " to clear every lock. No ticket, no account, no support channel."
            ) : null),
          h("div", { style: sty(`display:flex; gap:8px; margin-top:16px;`) },
            h("button", { onClick: fn(v.lockBack), style: sty(`background:transparent; border:1px solid #414942; border-radius:999px; padding:10px 18px; color:#C4CBC2; font:inherit; font-size:13px; cursor:pointer;`) },
              "Back"
            ),
            h("div", { style: sty(`flex:1;`) }),
            h("button", { onClick: fn(v.lockNext), style: sty(`background:#82D9A5; border:0; border-radius:999px; padding:10px 22px; color:#00391F; font:inherit; font-size:13px; font-weight:500; cursor:pointer;`) },
              S(v.lockNextLabel)
            )
          )
        ) : null),
      (v.unlockOpen ? h("div", { style: sty(`position:absolute; inset:0; background:rgba(0,0,0,.6); z-index:83; display:flex; align-items:center; justify-content:center;`) },
          h("div", { style: sty(`width:376px; background:#252B25; border-radius:24px; padding:24px; text-align:center; animation:dlgUnlock .3s cubic-bezier(.2,0,0,1);`) },
            h("span", { style: sty(`font-size:34px; color:#82D9A5;`), className: "msym" },
              "lock_open"
            ),
            h("div", { style: sty(`font-size:17px; font-weight:500; margin-top:10px;`) },
              `Unlock ${S(v.lockedTitle)}`
            ),
            h("div", { style: sty(`font-size:12.5px; color:#9AA39B; margin-top:6px; line-height:1.6;`) },
              "Enter this element's PIN. Forgot it? Delete ",
              h("span", { style: sty(`font-family:'Roboto Mono',monospace; color:#9FF7C4;`) },
                "%APPDATA%\\DingPbxConsole\\locks"
              ),
              "."
            ),
            h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#8FA394; margin-top:10px;`) },
              S(v.unlockMethod)
            ),
            (v.unlockNeedsPw ? h("div", { style: sty(`display:flex; align-items:center; gap:8px; background:#141A15; border:1px solid #414942; border-radius:10px; padding:11px 12px; margin-top:12px;`) },
                h("span", { style: sty(`font-size:17px; color:#82D9A5;`), className: "msym" },
                  "password"
                ),
                h("input", { type: `password`, value: v.unlockPwValue, onChange: fn(v.onUnlockPw), onInput: fn(v.onUnlockPw), placeholder: `Passphrase`, style: sty(`flex:1; background:transparent; border:0; outline:none; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:14px;`) })
              ) : null),
            (v.unlockNeedsTotp ? h("div", { style: sty(`display:flex; align-items:center; gap:8px; background:#141A15; border:1px solid #414942; border-radius:10px; padding:11px 12px; margin-top:8px;`) },
                h("span", { style: sty(`font-size:17px; color:#82D9A5;`), className: "msym" },
                  "phonelink_lock"
                ),
                h("span", { style: sty(`flex:1; text-align:left; font-size:12.5px; color:#9AA39B;`) },
                  "Six-digit code from the paired authenticator"
                ),
                h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:14px; color:#DFE4DC; letter-spacing:3px;`) },
                  "••••••"
                )
              ) : null),
            (v.unlockNeedsPin ? h("div", { style: sty(`display:flex; justify-content:center; gap:8px; margin:16px 0;`) },
                A(v.unlockDots).map(($d, $d$i) => R($d$i, h("span", { style: sty(`width:14px; height:14px; border-radius:50%; background:${S($d.bg)}; border:2px solid #414942;`) })))
              ) : null),
            h("div", { style: sty(`display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:12px;`) },
              A(v.unlockKeys).map(($k, $k$i) => R($k$i, h("button", { onClick: fn($k.press), style: sty(`height:50px; border-radius:14px; background:#1B211C; border:1px solid #414942; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:19px; cursor:pointer; transition:transform .08s;`), className: "k-h33" },
                  S($k.label)
                )))
            ),
            h("div", { style: sty(`display:flex; gap:8px; margin-top:14px; align-items:center;`) },
              h("button", { onClick: fn(v.closeUnlock), style: sty(`background:transparent; border:0; color:#9AA39B; font:inherit; font-size:12.5px; cursor:pointer; padding:10px 14px;`) },
                "Cancel"
              ),
              h("div", { style: sty(`flex:1;`) }),
              h("button", { onClick: fn(v.submitUnlock), style: sty(`background:#82D9A5; border:0; border-radius:999px; padding:11px 24px; color:#00391F; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`) },
                "Unlock"
              )
            )
          )
        ) : null),
      (v.appearOpen ? h("div", { style: sty(`position:absolute; right:0; top:40px; bottom:0; width:468px; background:#141A15; box-shadow:-8px 0 32px rgba(0,0,0,.5); z-index:84; display:flex; flex-direction:column; animation:dlgAppear .28s cubic-bezier(.2,0,0,1);`) },
          h("div", { style: sty(`padding:16px 20px 10px; display:flex; align-items:flex-start; gap:12px;`) },
            h("div", { style: sty(`flex:1;`) },
              h("div", { style: sty(`font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#8FA394;`) },
                "Edit appearance"
              ),
              h("div", { style: sty(`font-size:16px; font-weight:500; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                S(v.appearTarget)
              )
            ),
            h("button", { onClick: fn(v.closeAppear), style: sty(`width:34px; height:34px; border-radius:50%; background:transparent; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h1" },
              h("span", { style: sty(`font-size:19px;`), className: "msym" },
                "close"
              )
            )
          ),
          h("div", { style: sty(`padding:0 20px 10px; display:flex; gap:5px; flex-wrap:wrap;`) },
            A(v.appearStates).map(($t, $t$i) => R($t$i, F(
              ($t.on ? h("button", { onClick: fn($t.pick), style: sty(`background:#005230; border:0; border-radius:999px; padding:6px 13px; color:#9FF7C4; font:inherit; font-size:11.5px; font-weight:500; cursor:pointer;`) },
                  S($t.label)
                ) : null),
              ($t.off ? h("button", { onClick: fn($t.pick), style: sty(`background:transparent; border:1px solid #414942; border-radius:999px; padding:6px 13px; color:#9AA39B; font:inherit; font-size:11.5px; cursor:pointer;`), className: "k-h15" },
                  S($t.label)
                ) : null)
            )))
          ),
          h("div", { style: sty(`padding:0 20px 12px;`) },
            h("div", { style: sty(`border-radius:14px; background:repeating-conic-gradient(#1B211C 0% 25%, #171C18 0% 50%) 50%/16px 16px; padding:22px; display:flex; align-items:center; justify-content:center;`) },
              h("div", { style: sty(`${S(v.appearPreviewStyle)}`) },
                "Preview"
              )
            )
          ),
          h("div", { style: sty(`flex:1; overflow-y:auto; padding:0 20px 20px;`) },
            h("div", { style: sty(`margin-bottom:16px;`) },
              h("div", { style: sty(`display:flex; align-items:center; gap:8px; margin-bottom:10px;`) },
                h("span", { style: sty(`font-size:17px; color:#82D9A5;`), className: "msym" },
                  "colorize"
                ),
                h("span", { style: sty(`font-size:12px; letter-spacing:.8px; text-transform:uppercase; color:#8FA394; font-weight:500;`) },
                  "Infinite colour picker"
                ),
                h("div", { style: sty(`flex:1; height:1px; background:#262B26;`) }),
                h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#9FF7C4;`) },
                  S(v.colorValue)
                )
              ),
              h("div", { style: sty(`display:flex; gap:10px; align-items:stretch;`) },
                h("div", { style: sty(`width:56px; border-radius:12px; background:${S(v.colorValue)}; border:1px solid #414942; flex:0 0 auto;`) }),
                h("div", { style: sty(`flex:1; display:flex; flex-direction:column; gap:7px;`) },
                  h("div", { style: sty(`display:flex; gap:2px; height:26px; border-radius:8px; overflow:hidden;`) },
                    A(v.hueStops).map(($h, $h$i) => R($h$i, h("button", { onClick: fn($h.pick), title: $h.label, style: sty(`flex:1; border:0; padding:0; cursor:pointer; background:${S($h.color)};`) })))
                  ),
                  h("div", { style: sty(`display:flex; gap:2px; height:22px; border-radius:8px; overflow:hidden;`) },
                    A(v.shadeStops).map(($h, $h$i) => R($h$i, h("button", { onClick: fn($h.pick), style: sty(`flex:1; border:0; padding:0; cursor:pointer; background:${S($h.color)};`) })))
                  ),
                  h("div", { style: sty(`display:flex; gap:6px; flex-wrap:wrap;`) },
                    A(v.colorActions).map(($a, $a$i) => R($a$i, h("button", { onClick: fn($a.run), style: sty(`display:flex; align-items:center; gap:5px; background:#1B211C; border:1px solid #414942; border-radius:8px; padding:5px 10px; color:#C4CBC2; font:inherit; font-size:11.5px; cursor:pointer;`), className: "k-h26" },
                        h("span", { style: sty(`font-size:14px;`), className: "msym" },
                          S($a.icon)
                        ),
                        S($a.label)
                      )))
                  )
                )
              ),
              h("div", { style: sty(`display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;`) },
                A(v.colorFormats).map(($f, $f$i) => R($f$i, h("button", { onClick: fn($f.copy), style: sty(`background:#141A15; border:0; border-radius:8px; padding:6px 10px; color:#9AA39B; font-family:'Roboto Mono',monospace; font-size:11px; cursor:pointer;`), className: "k-h34" },
                    S($f.label)
                  )))
              )
            ),
            A(v.appearGroups).map(($g, $g$i) => R($g$i, h("div", { style: sty(`margin-bottom:16px;`) },
                h("div", { style: sty(`display:flex; align-items:center; gap:8px; margin-bottom:10px;`) },
                  h("span", { style: sty(`font-size:17px; color:#82D9A5;`), className: "msym" },
                    S($g.icon)
                  ),
                  h("span", { style: sty(`font-size:12px; letter-spacing:.8px; text-transform:uppercase; color:#8FA394; font-weight:500;`) },
                    S($g.title)
                  ),
                  h("div", { style: sty(`flex:1; height:1px; background:#262B26;`) })
                ),
                h("div", { style: sty(`display:flex; flex-direction:column; gap:13px;`) },
                  A($g.ctls).map(($c, $c$i) => R($c$i, h(M3Control, { ctl: $c })))
                )
              )))
          ),
          h("div", { style: sty(`padding:12px 20px; border-top:1px solid #262B26; display:flex; gap:8px; flex-wrap:wrap;`) },
            A(v.appearActions).map(($a, $a$i) => R($a$i, h("button", { onClick: fn($a.run), style: sty(`display:flex; align-items:center; gap:6px; background:#262B26; border:0; border-radius:999px; padding:9px 15px 9px 12px; color:#C4CBC2; font:inherit; font-size:12.5px; cursor:pointer;`), className: "k-h13" },
                h("span", { style: sty(`font-size:16px;`), className: "msym" },
                  S($a.icon)
                ),
                S($a.label)
              )))
          )
        ) : null),
      (v.sureOpen ? h("div", { style: sty(`position:absolute; inset:0; background:rgba(0,0,0,.66); z-index:86; display:flex; align-items:center; justify-content:center;`) },
          h("div", { style: sty(`width:520px; background:#252B25; border-radius:28px; padding:22px 26px; animation:dlgSure .34s cubic-bezier(.2,1.2,.3,1);`) },
            h("div", { style: sty(`display:flex; align-items:center; gap:12px;`) },
              h("span", { style: sty(`font-size:26px; color:#FFD68A;`), className: "msym" },
                "help_center"
              ),
              h("div", { style: sty(`flex:1;`) },
                h("div", { style: sty(`font-size:19px; font-weight:500;`) },
                  "Are you sure?"
                ),
                h("div", { style: sty(`font-size:12.5px; color:#9AA39B; margin-top:3px;`) },
                  S(v.sureTitle)
                )
              ),
              h("button", { onClick: fn(v.closeSure), style: sty(`width:34px; height:34px; border-radius:50%; background:transparent; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h32" },
                h("span", { style: sty(`font-size:19px;`), className: "msym" },
                  "close"
                )
              )
            ),
            h("div", { style: sty(`font-size:13px; color:#C4CBC2; line-height:1.6; margin:12px 0 14px;`) },
              S(v.sureBody)
            ),
            h("div", { style: sty(`background:#141A15; border-radius:16px; padding:14px;`) },
              h("div", { style: sty(`display:flex; align-items:center; gap:10px; margin-bottom:10px;`) },
                h("span", { style: sty(`font-size:19px; color:#82D9A5;`), className: "msym" },
                  "sports_esports"
                ),
                h("span", { style: sty(`font-size:12.5px; color:#C4CBC2;`) },
                  "Hit the targets to unlock Yes"
                ),
                h("div", { style: sty(`flex:1;`) }),
                h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:15px; color:#82D9A5;`) },
                  S(v.sureProgress)
                )
              ),
              h("div", { style: sty(`display:grid; grid-template-columns:repeat(4,1fr); gap:8px;`) },
                A(v.sureCells).map(($c, $c$i) => R($c$i, F(
                  ($c.up ? h("button", { onClick: fn($c.hit), style: sty(`height:54px; border-radius:14px; background:#005230; border:2px solid #82D9A5; cursor:pointer; display:flex; align-items:center; justify-content:center; animation:m3Pop .12s ease-out;`) },
                      h("span", { style: sty(`font-size:24px; color:#9FF7C4;`), className: "msym" },
                        "touch_app"
                      )
                    ) : null),
                  ($c.down ? h("div", { style: sty(`height:54px; border-radius:14px; background:#1B211C; border:2px solid #262B26;`) }) : null)
                )))
              )
            ),
            h("div", { style: sty(`display:flex; gap:10px; margin-top:16px; align-items:center;`) },
              h("button", { onClick: fn(v.closeSure), style: sty(`background:transparent; border:1px solid #414942; border-radius:999px; padding:11px 22px; color:#C4CBC2; font:inherit; font-size:13px; cursor:pointer;`) },
                "No, back out"
              ),
              h("div", { style: sty(`flex:1;`) }),
              (v.sureReady ? h("button", { onClick: fn(v.sureYes), style: sty(`background:#93000A; border:0; border-radius:999px; padding:12px 28px; color:#fff; font:inherit; font-size:13.5px; font-weight:600; cursor:pointer; animation:m3Glow 1.6s ease-in-out infinite;`) },
                  "Yes, do it"
                ) : null),
              (v.sureLocked ? h("div", { style: sty(`background:#1B211C; border-radius:999px; padding:12px 28px; color:#778078; font-size:13.5px; display:flex; align-items:center; gap:8px;`) },
                  h("span", { style: sty(`font-size:17px;`), className: "msym" },
                    "lock"
                  ),
                  "Yes is locked"
                ) : null)
            )
          )
        ) : null),
      (v.tabFilterOpen ? F(
        h("div", { onClick: fn(v.closeTabFilter), style: sty(`position:absolute; inset:0; background:rgba(0,0,0,.45); z-index:80;`) }),
        h("div", { style: sty(`position:absolute; left:50%; top:92px; transform:translateX(-50%); width:540px; background:#252B25; border-radius:20px; padding:20px 22px; box-shadow:0 12px 36px rgba(0,0,0,.6); z-index:81; animation:dlgFilter .24s cubic-bezier(.2,0,0,1);`) },
          h("div", { style: sty(`display:flex; align-items:center; gap:10px;`) },
            h("span", { style: sty(`font-size:21px; color:#82D9A5;`), className: "msym" },
              "filter_alt"
            ),
            h("div", { style: sty(`flex:1;`) },
              h("div", { style: sty(`font-size:16px; font-weight:500;`) },
                S(v.tabFilterTitle)
              ),
              h("div", { style: sty(`font-size:12px; color:#9AA39B; margin-top:2px;`) },
                "Type it, or build a pattern. The preview shows exactly which tabs close."
              )
            ),
            h("button", { onClick: fn(v.closeTabFilter), style: sty(`width:32px; height:32px; border-radius:50%; background:transparent; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h32" },
              h("span", { style: sty(`font-size:18px;`), className: "msym" },
                "close"
              )
            )
          ),
          (v.tabFilterIsColour ? h("div", { style: sty(`display:flex; flex-direction:column; gap:6px; margin-top:14px;`) },
              A(v.tabFilterColours).map(($c, $c$i) => R($c$i, h("button", { onClick: fn($c.pick), style: sty(`display:flex; align-items:center; gap:11px; background:#141A15; border:2px solid ${S($c.border)}; border-radius:12px; padding:10px 13px; cursor:pointer; text-align:left;`), className: "k-h32" },
                  h("span", { style: sty(`width:18px; height:18px; border-radius:50%; background:${S($c.colour)}; flex:0 0 auto;`) }),
                  h("div", { style: sty(`flex:1; min-width:0;`) },
                    h("div", { style: sty(`font-size:12.5px; color:#DFE4DC;`) },
                      S($c.count)
                    ),
                    h("div", { style: sty(`font-size:11.5px; color:#9AA39B; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                      S($c.tabs)
                    )
                  ),
                  h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#8FA394;`) },
                    S($c.label)
                  )
                )))
            ) : null),
          (v.tabFilterIsText ? h("div", { style: sty(`display:flex; align-items:center; gap:8px; background:#141A15; border:1px solid #414942; border-radius:10px; padding:11px 12px; margin-top:14px;`) },
              h("span", { style: sty(`font-size:17px; color:#82D9A5;`), className: "msym" },
                "keyboard"
              ),
              h("input", { type: `text`, value: v.tabFilterText, onChange: fn(v.onTabFilterText), onInput: fn(v.onTabFilterText), placeholder: `Text to match, e.g. queue`, style: sty(`flex:1; background:transparent; border:0; outline:none; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:14px;`) }),
              h("button", { onClick: fn(v.openTabRegex), title: `Build a pattern instead`, style: sty(`display:flex; align-items:center; gap:6px; background:#262B26; border:0; border-radius:8px; padding:6px 11px; color:#9FF7C4; font:inherit; font-size:11.5px; cursor:pointer;`), className: "k-h11" },
                h("span", { style: sty(`font-size:15px;`), className: "msym" },
                  "data_object"
                ),
                "Regex"
              )
            ) : null),
          h("div", { style: sty(`margin-top:12px; background:#141A15; border-radius:12px; padding:12px 14px;`) },
            h("div", { style: sty(`font-size:11px; letter-spacing:.8px; text-transform:uppercase; color:#8FA394; margin-bottom:8px;`) },
              "These tabs will close"
            ),
            h("div", { style: sty(`display:flex; flex-wrap:wrap; gap:6px;`) },
              A(v.tabFilterPreview).map(($p, $p$i) => R($p$i, h("span", { style: sty(`display:flex; align-items:center; gap:6px; background:${S($p.bg)}; border-radius:8px; padding:5px 11px; font-size:12px; color:${S($p.fg)};`) },
                  h("span", { style: sty(`font-size:14px;`), className: "msym" },
                    S($p.icon)
                  ),
                  S($p.label)
                )))
            )
          ),
          h("div", { style: sty(`display:flex; gap:8px; margin-top:16px; align-items:center;`) },
            h("button", { onClick: fn(v.closeTabFilter), style: sty(`background:transparent; border:1px solid #414942; border-radius:999px; padding:10px 20px; color:#C4CBC2; font:inherit; font-size:13px; cursor:pointer;`) },
              "Cancel"
            ),
            h("div", { style: sty(`flex:1;`) }),
            h("button", { onClick: fn(v.applyTabFilter), style: sty(`background:#93000A; border:0; border-radius:999px; padding:11px 24px; color:#fff; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`) },
              S(v.tabFilterApply)
            )
          )
        )
      ) : null),
      (v.tabColourOpen ? F(
        h("div", { onClick: fn(v.closeTabColour), style: sty(`position:absolute; inset:0; background:rgba(0,0,0,.45); z-index:80;`) }),
        h("div", { style: sty(`position:absolute; left:50%; top:110px; transform:translateX(-50%); width:400px; background:#252B25; border-radius:20px; padding:20px 22px; box-shadow:0 12px 36px rgba(0,0,0,.6); z-index:81; animation:dlgColour .3s cubic-bezier(.2,1.3,.3,1);`) },
          h("div", { style: sty(`display:flex; align-items:center; gap:10px;`) },
            h("span", { style: sty(`font-size:20px; color:#82D9A5;`), className: "msym" },
              "colorize"
            ),
            h("div", { style: sty(`flex:1;`) },
              h("div", { style: sty(`font-size:16px; font-weight:500;`) },
                S(v.cpickLabel)
              ),
              h("div", { style: sty(`font-size:12px; color:#9AA39B; margin-top:2px;`) },
                "Any colour at all, not a fixed palette. Rainbow cycles it forever."
              )
            ),
            h("span", { style: sty(`width:36px; height:36px; border-radius:10px; background:${S(v.cpickValue)}; border:1px solid #414942; animation:${S(v.cpickAnim)};`) })
          ),
          h("div", { style: sty(`display:flex; gap:2px; height:26px; border-radius:8px; overflow:hidden; margin-top:12px;`) },
            A(v.cpickHues).map(($h, $h$i) => R($h$i, h("button", { onClick: fn($h.pick), title: $h.label, style: sty(`flex:1; border:0; padding:0; cursor:pointer; background:${S($h.colour)};`) })))
          ),
          h("div", { style: sty(`display:flex; gap:2px; height:20px; border-radius:8px; overflow:hidden; margin-top:4px;`) },
            A(v.cpickShades).map(($h, $h$i) => R($h$i, h("button", { onClick: fn($h.pick), style: sty(`flex:1; border:0; padding:0; cursor:pointer; background:${S($h.colour)};`) })))
          ),
          h("div", { style: sty(`display:flex; flex-direction:column; gap:12px; margin-top:14px;`) },
            A(v.cpickCtls).map(($c, $c$i) => R($c$i, h(M3Control, { ctl: $c })))
          ),
          h("div", { style: sty(`display:flex; flex-wrap:wrap; gap:6px; margin-top:12px;`) },
            A(v.cpickFormats).map(($f, $f$i) => R($f$i, h("button", { onClick: fn($f.copy), style: sty(`background:#141A15; border:0; border-radius:8px; padding:6px 10px; color:#9AA39B; font-family:'Roboto Mono',monospace; font-size:11px; cursor:pointer;`), className: "k-h34" },
                S($f.label)
              )))
          ),
          h("div", { style: sty(`display:flex; flex-wrap:wrap; gap:8px; margin-top:12px;`) },
            A(v.tabColourOpts).map(($c, $c$i) => R($c$i, h("button", { onClick: fn($c.pick), style: sty(`width:34px; height:34px; border-radius:10px; background:${S($c.colour)}; border:2px solid ${S($c.border)}; cursor:pointer;`) }))),
            h("button", { onClick: fn(v.cpickApply), style: sty(`flex:1; min-width:120px; background:#82D9A5; border:0; border-radius:10px; padding:0 16px; color:#00391F; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`) },
              "Use this colour"
            )
          ),
          (v.hasUsedColours ? h("div", { style: sty(`margin-top:16px;`) },
              h("div", { style: sty(`font-size:11px; letter-spacing:.8px; text-transform:uppercase; color:#8FA394; margin-bottom:8px;`) },
                "Already used by other tabs"
              ),
              h("div", { style: sty(`display:flex; flex-direction:column; gap:6px;`) },
                A(v.usedColours).map(($u, $u$i) => R($u$i, h("button", { onClick: fn($u.pick), style: sty(`display:flex; align-items:center; gap:10px; background:#141A15; border:0; border-radius:10px; padding:9px 12px; cursor:pointer; text-align:left;`), className: "k-h32" },
                    h("span", { style: sty(`width:14px; height:14px; border-radius:50%; background:${S($u.colour)};`) }),
                    h("span", { style: sty(`flex:1; font-size:12.5px; color:#DFE4DC;`) },
                      S($u.tabs)
                    ),
                    h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#8FA394;`) },
                      S($u.colour)
                    )
                  )))
              )
            ) : null),
          h("button", { onClick: fn(v.closeTabColour), style: sty(`margin-top:16px; width:100%; background:transparent; border:1px solid #414942; border-radius:999px; padding:10px 0; color:#C4CBC2; font:inherit; font-size:13px; cursor:pointer;`) },
            "Cancel"
          )
        )
      ) : null),
      (v.renameOpen ? F(
        h("div", { onClick: fn(v.cancelRename), style: sty(`position:absolute; inset:0; background:rgba(0,0,0,.45); z-index:80;`) }),
        h("div", { style: sty(`position:absolute; left:50%; top:120px; transform:translateX(-50%); width:400px; background:#252B25; border-radius:20px; padding:20px 22px; box-shadow:0 12px 36px rgba(0,0,0,.6); z-index:81; animation:dlgRename .22s cubic-bezier(.2,0,0,1);`) },
          h("div", { style: sty(`font-size:16px; font-weight:500; margin-bottom:12px;`) },
            "Rename tab"
          ),
          h("div", { style: sty(`display:flex; align-items:center; gap:8px; background:#141A15; border:1px solid #414942; border-radius:10px; padding:11px 12px;`) },
            h("span", { style: sty(`font-size:17px; color:#82D9A5;`), className: "msym" },
              "edit"
            ),
            h("input", { type: `text`, value: v.renameValue, onChange: fn(v.onRename), onInput: fn(v.onRename), style: sty(`flex:1; background:transparent; border:0; outline:none; color:#DFE4DC; font-size:14px;`) })
          ),
          h("div", { style: sty(`display:flex; gap:8px; margin-top:16px;`) },
            h("button", { onClick: fn(v.cancelRename), style: sty(`flex:1; background:transparent; border:1px solid #414942; border-radius:999px; padding:10px 0; color:#C4CBC2; font:inherit; font-size:13px; cursor:pointer;`) },
              "Cancel"
            ),
            h("button", { onClick: fn(v.saveRename), style: sty(`flex:1; background:#82D9A5; border:0; border-radius:999px; padding:10px 0; color:#00391F; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`) },
              "Rename"
            )
          )
        )
      ) : null),
      (v.celebrate ? h("div", { style: sty(`position:absolute; inset:0; z-index:88; pointer-events:none; overflow:hidden; background:radial-gradient(ellipse at 50% 34%, rgba(27,77,51,.55), rgba(0,0,0,0) 62%);`) },
          A(v.confetti).map(($c, $c$i) => R($c$i, h("div", { style: sty(`position:absolute; left:${S($c.x)}; top:-40px; width:${S($c.size)}; height:${S($c.size)}; background:${S($c.color)}; border-radius:${S($c.radius)}; box-shadow:0 0 10px rgba(0,0,0,.35); animation:m3Fall ${S($c.dur)} cubic-bezier(.2,.6,.4,1) ${S($c.delay)} forwards;`) }))),
          h("div", { style: sty(`position:absolute; left:50%; top:34%; transform:translate(-50%,-50%); text-align:center;`) },
            h("div", { style: sty(`width:132px; height:132px; margin:0 auto 18px; border-radius:50%; background:rgba(159,247,196,.14); display:flex; align-items:center; justify-content:center; animation:m3Glow 1.1s ease-out infinite;`) },
              h("span", { style: sty(`font-size:74px; color:#9FF7C4; animation:m3Pop .34s cubic-bezier(.2,1.5,.4,1);`), className: "msym" },
                "celebration"
              )
            ),
            h("div", { style: sty(`font-size:52px; font-weight:700; color:#9FF7C4; letter-spacing:-1px; text-shadow:0 4px 24px rgba(0,0,0,.7); animation:m3Pop .34s cubic-bezier(.2,1.6,.4,1);`) },
              S(v.celebrateTitle)
            ),
            h("div", { style: sty(`font-size:18px; color:#DFF3E5; margin-top:10px; text-shadow:0 2px 12px rgba(0,0,0,.8); animation:m3Rise .4s ease-out .1s backwards;`) },
              S(v.celebrateSub)
            )
          )
        ) : null),
      (v.toastOpen ? h("div", { style: sty(`position:absolute; left:50%; bottom:24px; transform:translateX(-50%); display:flex; align-items:center; gap:16px; background:#E4E9E0; color:#1A1C19; border-radius:12px; padding:12px 16px 12px 20px; box-shadow:0 6px 20px rgba(0,0,0,.5); z-index:85; animation:m3Slide .26s cubic-bezier(.2,1.3,.4,1);`) },
          h("span", { style: sty(`font-size:13.5px;`) },
            S(v.toastText)
          ),
          h("button", { onClick: fn(v.undoToast), style: sty(`background:transparent; border:0; color:#146B41; font:inherit; font-size:13.5px; font-weight:500; cursor:pointer; padding:4px 8px; border-radius:8px;`) },
            "Undo"
          )
        ) : null)
    )
  );
}
const P = { primary:'#82D9A5', onPrim:'#00391F', dim:'#9AA39B', text:'#DFE4DC' };

const ctl = (id, label, kind, value, extra) => Object.assign({ id, label, kind, value }, extra || {});

const RAIL = [
  { id:'pbx', icon:'call', label:'PBX', groupLabel:'Telephony', groupDesc:'Endpoints, routing and everything a call touches while it is alive.' },
  { id:'media', icon:'graphic_eq', label:'Media', groupLabel:'Media & voice', groupDesc:'Codecs, RTP, recordings, prompts and conferencing.' },
  { id:'data', icon:'monitoring', label:'Data', groupLabel:'Records & APIs', groupDesc:'Call records, event logging and the machine interfaces.' },
  { id:'sys', icon:'settings_applications', label:'System', groupLabel:'Runtime & security', groupDesc:'Modules, logging, certificates and the CLI.' },
  { id:'agent', icon:'memory', label:'Agent', groupLabel:'Agent global memory', groupDesc:'Memory, sync, skills, hub sessions and the emission guard.' },
  { id:'app', icon:'tune', label:'App', groupLabel:'Deploy & application', groupDesc:'Stand up a new server, then appearance, updates and the console itself.' }
];

function pjsipCtls() {
  return [
    { title:'Identity', desc:'Who this endpoint claims to be on the wire, and what the far end is allowed to present back.', ctls:[
      ctl('e_transport','Transport','select','transport-udp',{ options:['transport-udp','transport-tcp','transport-tls','transport-wss'], info:'A transport is the road the signalling travels on. UDP is the plain road, TLS is the same road inside an armoured tunnel.' }),
      ctl('e_context','Dialplan context','select','from-internal',{ options:['from-internal','from-external','from-trunk','sip-guest'], info:'When this endpoint dials, Asterisk looks for the number inside this context. Think of it as which phone book gets opened.' }),
      ctl('e_trust','Trust inbound identity','switch',false,{ info:'Only turn this on for carriers you control. It tells Asterisk to believe P-Asserted-Identity headers the other side sends.' })
    ]},
    { title:'Media & NAT', desc:'Every option here came out of pjsip.conf. Toggle, do not type.', ctls:[
      ctl('e_direct','direct_media','switch',false,{ info:'Off means audio goes through Asterisk. On means the two phones talk to each other directly and Asterisk steps out of the audio path.' }),
      ctl('e_symmetric','rtp_symmetric','switch',true),
      ctl('e_forcerport','force_rport','switch',true),
      ctl('e_rewrite','rewrite_contact','switch',true,{ info:'Needed when a phone behind a home router announces its private address. Asterisk quietly replaces it with the address the packet really came from.' }),
      ctl('e_ice','ice_support','switch',false),
      ctl('e_encryption','media_encryption','segmented','sdes',{ options:['no','sdes','dtls'] }),
      ctl('e_dtmf','dtmf_mode','segmented','rfc4733',{ options:['rfc4733','inband','info','auto'] })
    ]},
    { title:'Registration & AOR', desc:'How many devices may share this identity and how often Asterisk pokes them.', ctls:[
      ctl('e_maxcontacts','max_contacts','stepper',2,{ min:0, max:10 }),
      ctl('e_removeexisting','remove_existing','switch',false,{ info:'When a new registration arrives and max_contacts is already reached, this displaces the oldest contact instead of refusing the new one.' }),
      ctl('e_qualify','qualify_frequency','slider',60,{ min:0, max:300, step:10, unit:'s', info:'Asterisk sends a tiny OPTIONS ping this often to see if the phone is still alive. Zero switches the pings off.' }),
      ctl('e_expiry','Registration expiry','slider',3600,{ min:60, max:7200, step:60, unit:'s' }),
      ctl('e_codecs','Allowed codecs','order',['opus','g722','ulaw','alaw'],{ pool:['opus','g722','ulaw','alaw','g729','gsm'] })
    ]},
    { title:'Media streams', desc:'Stream ceilings and opportunistic encryption. These write pjsip.conf keys directly; a control left untouched writes nothing at all.', ctls:[
      ctl('e_maxaudio','max_audio_streams','stepper',1,{ min:0, max:10, info:'How many simultaneous audio streams this endpoint may negotiate.' }),
      ctl('e_maxvideo','max_video_streams','stepper',1,{ min:0, max:10, info:'The same ceiling for video. Zero refuses video outright.' }),
      ctl('e_optimistic','media_encryption_optimistic','switch',false,{ info:'Opportunistic SRTP: offer encryption, but do not refuse the call when the far end cannot do it. Encryption becomes best-effort rather than required, which is a real downgrade and not merely a compatibility setting.' })
    ]},
    { title:'Session timers', desc:'Whether Asterisk keeps proving a call is still alive, and how often.', ctls:[
      ctl('e_timers','timers','segmented','yes',{ options:['no','yes','required','always'] }),
      ctl('e_timers_min_se','timers_min_se','slider',90,{ min:90, max:1800, step:10, unit:'s', info:'The shortest refresh interval this endpoint will accept. Asterisk refuses anything below 90.' }),
      ctl('e_timers_sess','timers_sess_expires','slider',1800,{ min:90, max:7200, step:30, unit:'s', info:'The session expires after this long without a refresh.' })
    ]},
    { title:'Timeouts & device state', desc:'When Asterisk gives up on silent media, and when this endpoint counts as busy.', ctls:[
      ctl('e_rtp_timeout','rtp_timeout','slider',0,{ min:0, max:300, step:5, unit:'s', info:'Hang up after this long with no RTP arriving. Zero disables the check entirely.' }),
      ctl('e_rtp_hold','rtp_timeout_hold','slider',0,{ min:0, max:600, step:5, unit:'s', info:'The same, while the call is on hold, where silence is expected and the timeout usually wants to be longer.' }),
      ctl('e_busy_at','device_state_busy_at','stepper',0,{ min:0, max:20, info:'Report this endpoint busy once it has this many calls. Zero means never report busy on count.' }),
      ctl('e_refer_blind','refer_blind_progress','switch',true,{ info:'Whether a blind transfer reports its progress back to the transferring party.' })
    ]},
    { title:'MWI', desc:'How message-waiting notifications are delivered to this endpoint.', ctls:[
      ctl('e_aggregate_mwi','aggregate_mwi','switch',true,{ info:'Send one summary for every mailbox rather than a separate notification each.' }),
      ctl('e_mwi_replaces','mwi_subscribe_replaces_unsolicited','switch',false,{ info:'When the endpoint subscribes for MWI, stop sending it unsolicited notifications as well.' })
    ]},
    { title:'Outbound', desc:'Where outbound requests from this endpoint go, and what authenticates them.', ctls:[
      ctl('e_outbound_proxy','outbound_proxy','text','',{ placeholder:'sip:proxy.example.net:5060\;lr', info:'A full SIP URI. Asterisk requires the lr parameter, and it must be escaped in the config file.' }),
      ctl('e_outbound_auth','outbound_auth','text','',{ placeholder:'auth-section-name', info:'Names an auth section used for outbound requests. Left empty, nothing is written.' })
    ]},
    { title:'Voicemail', desc:'Where this endpoint sends message-waiting notifications.', ctls:[
      ctl('e_mailboxes','mailboxes','text','',{ info:'Comma-separated mailbox@context pairs, e.g. 6001@default. Asterisk NOTIFYs this endpoint whenever any of them changes.' }),
      ctl('e_voicemail_ext','voicemail_extension','text','',{ info:'The extension sent in the NOTIFY Message-Account header. Leave blank to use the global default_voicemail_extension.' })
    ]}
  ];
}

const SCREENS = {
  dash:{ rail:'pbx', icon:'space_dashboard', label:'Dashboard', badge:'live', title:'Dashboard', file:'live', kind:'dashboard',
    sub:'Everything the PBX is doing right now. Numbers come from AMI, not from a config file, so nothing here is editable — it is the truth of the running system.', groups:[] },
  live:{ rail:'pbx', icon:'graphic_eq', label:'Live channels', badge:'4', title:'Live channels', file:'core show channels', kind:'table',
    sub:'Every channel currently up. Spy, record or hang up any of them; each action runs the full four-gate confirmation.',
    table:{ add:'Originate call', grid:'1.5fr 1fr 1fr 90px 110px', cols:['Channel','Peer','Application','Duration','State'],
      rows:[['PJSIP/1001-0000a1','Ada Deng','Dial','00:04:12','Up'],['PJSIP/1004-0000a2','support queue','Queue','00:01:47','Up'],['PJSIP/trunk-0000a3','+1 415 555 0148','Dial','00:12:03','Up'],['IAX2/branch-0000a4','branch-office','Bridge','01:22:58','Up']] },
    groups:[{ title:'Monitor defaults', desc:'Applied to any spy or recording started from this screen.', ctls:[
      ctl('m_spy','Spy mode','segmented','Whisper',{ options:['Listen','Whisper','Barge'] }),
      ctl('m_format','Recording format','segmented','wav',{ options:['wav','gsm','g722','ogg'] }),
      ctl('m_beep','Beep on record start','switch',true),
      ctl('m_retain','Keep recordings for','slider',90,{ min:1, max:365, unit:' days' })
    ]}] },
  endpoints:{ rail:'pbx', icon:'smartphone', label:'Endpoints', badge:'12', title:'PJSIP endpoints', file:'pjsip.conf', kind:'table',
    sub:'Phones, softphones and applications that register with this PBX. Selecting a row loads its full option set below — every one of them a control, never a text field.',
    table:{ add:'New endpoint', grid:'1fr 1.2fr 1fr 1fr 120px', cols:['Endpoint','Contact','Transport','Codecs','Status'],
      rows:[['1001','10.20.4.31:5060','transport-tls','opus, g722','Reachable'],['1002','10.20.4.32:5060','transport-tls','opus, ulaw','Reachable'],['1003','10.20.4.44:5060','transport-udp','ulaw','Unreachable'],['1004','10.20.4.51:5060','transport-tls','opus, g722','Reachable'],['softphone-ada','198.51.100.9:39412','transport-wss','opus','Reachable'],['reception','10.20.4.12:5060','transport-udp','g722, ulaw','Reachable']] },
    groups:pjsipCtls() },
  trunks:{ rail:'pbx', icon:'swap_horiz', label:'Trunks', badge:'3', title:'Trunks & registrations', file:'pjsip.conf · iax.conf', kind:'table',
    sub:'Outbound carriers and inbound identifies, PJSIP and IAX2 alike -- iax2 show registry reads the same table `pjsip show registrations` already fed it. Registration state is polled live; credentials live in the secret intake, never on this screen.',
    table:{ add:'New trunk', grid:'1fr 1.4fr 1fr 1fr 120px', cols:['Trunk','Registrar','Auth','Outbound','State'],
      rows:[['carrier-primary','sip.carrier.example','userpass','yes','Registered'],['carrier-backup','sip2.carrier.example','userpass','yes','Registered']] },
    groups:[{ title:'Failover', desc:'What happens when the primary carrier stops answering.', ctls:[
      ctl('t_retry','Retry interval','slider',60,{ min:10, max:600, step:10, unit:'s' }),
      ctl('t_forbidden','Forbidden retry','slider',300,{ min:30, max:1800, step:30, unit:'s' }),
      ctl('t_fatal','Fatal retry attempts','stepper',5,{ min:0, max:50 })
    ]},{ title:'Outbound identity', desc:'How your calls appear to the carrier.', ctls:[
      ctl('t_pai','Send P-Asserted-Identity','switch',true),
      ctl('t_100rel','100rel','segmented','yes',{ options:['no','required','yes'] })
    ]}] },
  trunkauth:{ rail:'pbx', icon:'handshake', label:'Trunk authentication', badge:'2', title:'Trunk authentication', file:'pjsip.conf · partner requests', kind:'trunkauth',
    sub:'When a trunk partner asks to change something on the shared link — a new source address, a codec, a higher call cap — the request lands here and you answer yes or no. Nothing takes effect until you do.',
    groups:[{ title:'Answering policy', desc:'How requests arrive and what may be answered without you.', ctls:[
      ctl('ta_auto','Auto-approve low-risk requests','switch',false,{ info:'Low risk means a codec addition or a health-check interval. Address changes and call caps are never auto-approved.' }),
      ctl('ta_expire','Requests expire after','slider',48,{ min:1, max:168, unit:' h' }),
      ctl('ta_notify','Notify on new request','switch',true),
      ctl('ta_mutual','Require mutual confirmation','switch',true,{ info:'Both sides must answer yes. A one-sided yes stays pending, which is what stops a partner quietly widening the link.' }),
      ctl('ta_sign','Sign my answers','switch',true),
      ctl('ta_log','Keep the answer history forever','switch',true)
    ]}] },
  canvas:{ rail:'pbx', icon:'account_tree', label:'Dialplan canvas', badge:'∞', title:'Dialplan canvas', file:'extensions.conf', kind:'canvas',
    sub:'One infinite canvas for dialplan, IVR and queue routing. Drop a step, wire it to the next, and the console writes the priorities for you. The inspector on the right edits whichever step is selected.', groups:[] },
  ivr:{ rail:'pbx', icon:'dialpad', label:'IVR menus', badge:'5', title:'IVR menus', file:'extensions.conf', kind:'table',
    sub:'Each menu is a canvas subgraph with a prompt and a key map. Editing a key here moves the matching node on the canvas.',
    table:{ add:'New menu', grid:'1fr 1.4fr 90px 110px 120px', cols:['Menu','Prompt','Keys','Timeout','Invalid'],
      rows:[['main','welcome-greeting','5','7s','repeat'],['support','support-options','4','7s','operator'],['sales','sales-options','3','5s','voicemail'],['afterhours','closed-message','2','10s','hangup'],['directory','dial-by-name','1','12s','operator']] },
    groups:[{ title:'Menu behaviour', desc:'Applies to the selected menu.', ctls:[
      ctl('i_timeout','Digit timeout','slider',7,{ min:1, max:30, unit:'s' }),
      ctl('i_retries','Retries before fallback','stepper',3,{ min:1, max:9 }),
      ctl('i_invalid','On invalid entry','segmented','Repeat',{ options:['Repeat','Operator','Voicemail','Hangup'] }),
      ctl('i_direct','Allow direct extension dial','switch',true),
      ctl('i_lang','Prompt language','select','en',{ options:['en','es','fr','de','zh'] }),
      ctl('i_barge','Allow barge-in over prompt','switch',true),
      ctl('i_plan','The dialplan this makes','text','',{ action:'ivr-dialplan', info:'These controls do not map onto settings, because extensions.conf has no key called retries -- they describe an IVR, and an IVR is a shape made out of exten lines. This is exactly what would be written, so it can be read first: a form that silently writes call routing is a form nobody should trust.' })
    ]}] },
  queues:{ rail:'pbx', icon:'groups', label:'Queues & agents', badge:'4', title:'Queues & agents', file:'queues.conf', kind:'table',
    sub:'Ring strategy, penalties and service level, all lifted from queues.conf. Agents are dragged between queues on the canvas.',
    table:{ add:'New queue', grid:'1fr 1fr 90px 90px 120px', cols:['Queue','Strategy','Members','Waiting','Service level'],
      rows:[['support','ringall','6','2','92%'],['sales','leastrecent','4','0','97%'],['billing','fewestcalls','3','1','88%'],['afterhours','random','1','0','100%']] },
    groups:[{ title:'Ring strategy', desc:'How a waiting call is offered to the members of this queue.', ctls:[
      ctl('q_strategy','strategy','select','ringall',{ options:['ringall','leastrecent','fewestcalls','random','rrmemory','linear','wrandom'], info:'ringall rings every free agent at once. leastrecent picks whoever has gone longest without a call. Pick ringall if you are not sure.' }),
      ctl('q_timeout','Ring each agent for','slider',15,{ min:5, max:120, unit:'s' }),
      ctl('q_wrapup','wrapuptime','slider',15,{ min:0, max:300, unit:'s', info:'Breathing room after a call ends before that agent may be rung again.' }),
      ctl('q_retry','Retry gap','slider',5,{ min:0, max:60, unit:'s' }),
      ctl('q_ringinuse','ringinuse','switch',false),
      ctl('q_autopause','autopause','segmented','no',{ options:['no','yes','all'] })
    ]},{ title:'Capacity & announcements', desc:'What callers hear and when the queue turns them away.', ctls:[
      ctl('q_maxlen','Maximum callers','stepper',25,{ min:0, max:200 }),
      ctl('q_service','servicelevel','slider',60,{ min:10, max:600, step:10, unit:'s' }),
      ctl('q_joinempty','joinempty','chips',['paused','invalid'],{ options:['paused','inuse','invalid','unavailable','ringing'] }),
      ctl('q_leave','leavewhenempty','chips',['inuse'],{ options:['paused','inuse','invalid','unavailable','ringing'] }),
      ctl('q_periodic','Periodic announcement every','slider',60,{ min:0, max:600, step:15, unit:'s' }),
      ctl('q_position','Announce position in queue','switch',true)
    ]}] },
  voicemail:{ rail:'media', icon:'voicemail', label:'Voicemail', badge:'18', title:'Voicemail boxes', file:'voicemail.conf', kind:'table',
    sub:'Mailboxes, greetings and delivery. Attachment and storage options are switches; nothing about a mailbox needs typing except the owner name.',
    table:{ add:'New mailbox', grid:'90px 1fr 1fr 90px 110px', cols:['Box','Owner','Email','New','Storage'],
      rows:[['1001','Ada Deng','ada@example.com','3','file'],['1002','Ben Ortiz','ben@example.com','0','file'],['1004','Support desk','support@example.com','12','odbc'],['1010','Reception','front@example.com','3','file']] },
    groups:[{ title:'Delivery', desc:'What happens the moment a message lands.', ctls:[
      ctl('v_attach','Attach recording to email','switch',true),
      ctl('v_delete','Delete after emailing','switch',false,{ info:'Careful. On means the only copy of the message is the one in the mailbox of the email server.' }),
      ctl('v_format','Message format','segmented','wav49',{ options:['wav','wav49','gsm','ogg'] }),
      ctl('v_maxmsg','Maximum messages','stepper',100,{ min:1, max:1000 }),
      ctl('v_maxsecs','Maximum message length','slider',180,{ min:15, max:600, step:15, unit:'s' }),
      ctl('v_minsecs','Discard shorter than','slider',3,{ min:0, max:30, unit:'s' })
    ]},{ title:'Caller experience', desc:'Prompts, review and escape routes.', ctls:[
      ctl('v_review','Let caller review','switch',true),
      ctl('v_operator','Zero escapes to operator','switch',true),
      ctl('v_envelope','Play date envelope','switch',true),
      ctl('v_saycid','Announce caller ID','switch',false)
    ]}] },
  confbridge:{ rail:'media', icon:'groups_3', label:'Conferences', badge:'6', title:'ConfBridge rooms', file:'confbridge.conf', kind:'table',
    sub:'Bridge profiles, user profiles and menus. Every mixing option is a control; the DTMF menu is edited on the canvas.',
    table:{ add:'New room', grid:'1fr 1fr 90px 100px 110px', cols:['Room','Bridge profile','Users','Recording','State'],
      rows:[['9000','default_bridge','7','on','Active'],['9001','hd_bridge','2','off','Active'],['9002','townhall','48','on','Active'],['9003','default_bridge','0','off','Idle']] },
    groups:[{ title:'Mixing', desc:'Audio quality and how the bridge combines participants.', ctls:[
      ctl('c_rate','Internal sample rate','segmented','48000',{ options:['8000','16000','48000','auto'] }),
      ctl('c_mixing','Mixing interval','segmented','20',{ options:['10','20','40','80'] }),
      ctl('c_video','Video mode','segmented','follow_talker',{ options:['none','follow_talker','last_marked','sfu'] }),
      ctl('c_denoise','Denoise','switch',true),
      ctl('c_jitter','Jitter buffer','switch',true),
      ctl('c_talker','Talker detection events','switch',true)
    ]},{ title:'Participants', desc:'What each caller may do once inside.', ctls:[
      ctl('c_max','Maximum members','stepper',50,{ min:2, max:500 }),
      ctl('c_marked','Wait for marked user','switch',true),
      ctl('c_announce','Announce join and leave','segmented','name',{ options:['off','name','count'], info:'One setting here, two in confbridge.conf: announce_join_leave and announce_user_count. A tone is not either of them -- it is a sound file, so that option was removed rather than mapped onto a boolean that means something else.' }),
      ctl('c_music','Music while alone','switch',true)
    ]}] },
  moh:{ rail:'media', icon:'library_music', label:'Music on hold', badge:'4', title:'Music on hold', file:'musiconhold.conf', kind:'table',
    sub:'Hold classes and their sources. Files are chosen from a picker; the playlist is reordered by dragging.',
    table:{ add:'New class', grid:'1fr 1fr 1.2fr 100px', cols:['Class','Mode','Source','Tracks'],
      rows:[['default','files','/var/lib/asterisk/moh','14'],['jazz','files','/srv/moh/jazz','22'],['ringing','ringing','—','—'],['stream','custom','mpg123 stream','—']] },
    groups:[{ title:'Playback', desc:'How each class behaves while somebody waits.', ctls:[
      ctl('h_mode','Mode','segmented','files',{ options:['files','quietmp3','ringing','custom'] }),
      // Choosing a mode used to be the end of it: `files` never asked which directory and
      // `custom` never asked what to run, so either choice could be made and never
      // completed. These are the fields musiconhold.conf actually requires for each mode,
      // revealed only for the mode that uses them.
      ctl('h_directory','Audio directory','text','/var/lib/asterisk/moh',{ showWhen:{ control:'h_mode', is:'files' },
        info:'The directory Asterisk plays hold audio from. Written to musiconhold.conf as directory.' }),
      ctl('h_upload','Add an audio file','file','',{ showWhen:{ control:'h_mode', is:'files' }, accept:'audio/*',
        info:'Uploads one audio file into the directory above. Asterisk plays what it finds there; nothing is transcoded on the way in.' }),
      // `custom` in musiconhold.conf runs a program and reads its output, so what it needs
      // is a command rather than a file. Offering an upload here would be the wrong
      // control for the mode, however much it looks like the helpful one.
      ctl('h_application','Streaming command','text','',{ showWhen:{ control:'h_mode', is:'custom' },
        info:'The program Asterisk runs and reads audio from. Written to musiconhold.conf as application.' }),
      ctl('h_sort','Playback order','segmented','random',{ options:['alpha','random','randstart'], showWhen:{ control:'h_mode', is:'files' } })
    ]}] },
  /*
   * Every prompt Asterisk can play back — the greetings an IVR menu names in a `select`
   * that only ever lists three fixed strings (see `dp_prompt`/`wi_file` on the wizard
   * steps), the voicemail-instruction language, the whole "custom announcement" idea —
   * lives at exactly one place on disk: `/var/lib/asterisk/sounds`. Nothing on this
   * console could ever put a file there before this screen, so "custom" meant "you may
   * describe a prompt that does not exist and nothing will notice".
   *
   * This is not `pbx.config`: there is no `[section]`/`key=value` file behind
   * `/var/lib/asterisk/sounds` for a `ConfigTransaction` to plan, stage and roll back --
   * it is a directory of files, and `control-plane/media-library.ts`'s `MediaLibrary`
   * already owns exactly that surface (list/upload/remove, plus the `read` this screen's
   * own audition action needed and nothing before it did). This screen calls that
   * library through `media.list`/`media.upload`/`media.remove`/`media.read` and nothing
   * else -- see `App.tsx`'s `onAddPromptRow`, `onAuditionPromptRow` and
   * `onRemovePromptRow` for the one path each of those four verbs takes.
   */
  sounds:{ rail:'media', icon:'play_arrow', label:'Sound prompts', badge:'6', title:'Sound prompt library', file:'/var/lib/asterisk/sounds', kind:'table',
    sub:'Every prompt file really sitting in /var/lib/asterisk/sounds on the connected target -- read straight from MediaLibrary, the same class every "custom" file picker elsewhere in this console already validates against. Upload adds one; a row’s own menu auditions or removes it. Accepted: wav, gsm, ulaw, alaw, g722, sln, sln16, ogg, opus -- anything else, or a file whose bytes do not match what it claims to be, is refused before it ever reaches the target.',
    table:{ add:'Upload a prompt', grid:'1.8fr 90px 100px 130px', cols:['File','Format','Size','Playback'],
      rows:[['welcome-greeting.wav','wav','482 KB','Playable'],['support-options.wav','wav','390 KB','Playable'],['sales-options.wav','wav','355 KB','Playable'],['closed-message.gsm','gsm','61 KB','Download only'],['dial-by-name.wav','wav','210 KB','Playable'],['hold-loop.ogg','ogg','1.1 MB','Playable']] },
    groups:[] },
  httpd:{ rail:'sys', icon:'http', label:'HTTP server', badge:'', title:'HTTP server', file:'http.conf', kind:'generic',
    sub:'Asterisk’s own mini-HTTP server, which ARI, the WebSocket transport and the status page all sit on. Three of these keys are spelled differently from the FreePBX settings that map to them, and this screen writes the spelling Asterisk actually reads.',
    groups:[{ title:'Listener', desc:'Whether the server runs at all, and where it listens.', ctls:[
      ctl('ht_enabled','enabled','switch',false,{ info:'Off is the Asterisk default. ARI and the WebSocket transport both need this on.' }),
      ctl('ht_bindaddr','bindaddr','text','',{ placeholder:'127.0.0.1', info:'The sample binds to loopback. Widening this exposes the server to the network, so change it deliberately.' }),
      ctl('ht_bindport','bindport','stepper',8088,{ min:1, max:65535 }),
      ctl('ht_prefix','prefix','text','',{ placeholder:'asterisk', info:'A path prefix every URL sits under.' })
    ]},
    { title:'Served content', desc:'What the server hands out beyond the API.', ctls:[
      ctl('ht_static','enable_static','switch',false,{ info:'Serves the static-http directory. The key has an underscore even though the FreePBX setting name does not; writing enablestatic emits a line Asterisk ignores.' }),
      ctl('ht_status','enable_status','switch',false,{ info:'Serves a status page describing the running server. Same underscore.' })
    ]},
    { title:'TLS', desc:'The HTTPS listener. Asterisk keeps the address and port in one key; this screen edits them separately and recomposes them.', ctls:[
      ctl('ht_tlsenable','tlsenable','switch',false),
      ctl('ht_tlsaddr','tlsbindaddr address','text','',{ placeholder:'0.0.0.0' }),
      ctl('ht_tlsport','tlsbindaddr port','stepper',8089,{ min:1, max:65535 }),
      ctl('ht_tlscert','tlscertfile','text','',{ placeholder:'/etc/asterisk/keys/asterisk.pem', info:'Turning TLS on without this produces a listener Asterisk refuses to start.' }),
      ctl('ht_tlskey','tlsprivatekey','text','',{ placeholder:'/etc/asterisk/keys/asterisk.key' })
    ]},
    { title:'TLS versions', desc:'All three default to disabled in current Asterisk. Re-enabling one is a deliberate downgrade for a device that cannot do better.', ctls:[
      ctl('ht_notls1','tlsdisablev1','switch',true),
      ctl('ht_notls11','tlsdisablev11','switch',true),
      ctl('ht_notls12','tlsdisablev12','switch',true)
    ]},
    { title:'Sessions', desc:'How many HTTP sessions the server keeps, and for how long.', ctls:[
      ctl('ht_sesslimit','sessionlimit','stepper',100,{ min:1, max:10000, info:'No underscore in this key, unlike the two below it. That inconsistency is Asterisk’s own.' }),
      ctl('ht_sessinact','session_inactivity','slider',30000,{ min:1000, max:300000, step:1000, unit:' ms' }),
      ctl('ht_sesskeep','session_keep_alive','slider',15000,{ min:1000, max:120000, step:1000, unit:' ms' }),
      ctl('ht_save','Save http.conf settings','segmented','Save',{ options:['Save'], action:'httpd-save', info:'Writes every field on this screen, including TLS, to http.conf on the target -- backed up first, applied through the same plan/apply transaction every other write in this console uses.' })
    ]}]
  },
  iaxpeers:{ rail:'pbx', icon:'swap_horiz', label:'IAX peers', badge:'', title:'IAX peers', file:'iax.conf', kind:'table',
    sub:'IAX2 peers, users and friends -- the table is iax2 show peers, live off the target; selecting a row loads that exact peer\'s real iax.conf section below. The secret is write-only: this screen can set one and can never show you the one already there, which is why there is no field displaying it.',
    table:{ add:'New peer', grid:'1fr 1.3fr 90px 90px 140px', cols:['Peer','Host','Dynamic','Trunk','Status'], rows:[] },
    groups:[{ title:'Identity', desc:'What this peer is and where it lives.', ctls:[
      ctl('ix_type','type','segmented','friend',{ options:['user','peer','friend'] }),
      ctl('ix_host','host','text','',{ placeholder:'dynamic', info:'An address, or dynamic when the far end registers to you.' }),
      ctl('ix_username','username','text','',{ placeholder:'asterisk' }),
      ctl('ix_port','port','stepper',4569,{ min:1, max:65535, info:'IAX2 is 4569 by default; the sample shows 5036 for a second instance.' })
    ]},
    { title:'Call handling', desc:'Transfers, liveness and call-token validation.', ctls:[
      ctl('ix_transfer','transfer','segmented','yes',{ options:['no','yes','mediaonly'], info:'Native IAX2 transfer. mediaonly keeps the signalling here and moves only the audio.' }),
      ctl('ix_qualify','qualify','text','',{ placeholder:'yes', info:'yes, no, or a millisecond threshold.' }),
      ctl('ix_trunk','trunk','switch',false,{ info:'IAX2 trunking multiplexes several calls into one stream to this host.' }),
      ctl('ix_calltoken','requirecalltoken','segmented','yes',{ options:['no','yes','auto'], info:'Call-token validation resists spoofed call setup. auto requires it only from peers known to support it. Turning it off weakens that protection.' })
    ]},
    { title:'Media', desc:'Codecs offered to this peer, in order.', ctls:[
      ctl('ix_codecs','Allowed codecs','order',['ulaw','alaw'],{ pool:['opus','g722','ulaw','alaw','g729','gsm','ilbc','speex'], info:'Written as disallow=all followed by the allow list, which is what makes an allow list mean anything.' })
    ]},
    { title:'Routing & accounting', desc:'Where calls land and how they are recorded.', ctls:[
      ctl('ix_context','context','text','',{ placeholder:'from-internal', info:'The dialplan context inbound calls enter. iax.conf permits several; the first is the default.' }),
      ctl('ix_accountcode','accountcode','text','',{ placeholder:'lss0101' }),
      ctl('ix_mailbox','mailbox','text','',{ placeholder:'1234' })
    ]},
    { title:'Credential', desc:'Write-only. Setting a secret replaces whatever is there; nothing on this screen can read one back.', ctls:[
      ctl('ix_secret_set','Set a new secret','switch',false,{ info:'Leave this off and the existing secret is left exactly as it is. Switch it on and a strong secret is generated, written once, and shown once — this console never stores or redisplays it.' })
    ]},
    { title:'Save', desc:'Select a peer from the table above first -- this writes only what changed for that exact peer, backed up first and applied through the same plan/apply transaction every other write in this console uses.', ctls:[
      ctl('ix_save','Save this peer','segmented','Save',{ options:['Save'], action:'iaxpeers-save' })
    ]}]
  },
  fcodes:{ rail:'pbx', icon:'dialpad', label:'Feature codes', badge:'', title:'Feature codes', file:'features.conf', kind:'generic',
    sub:'The digits a caller presses mid-call, the transfer behaviour around them, and the parking lot a park sends a call into. The codes and timeouts below write features.conf; the parking lot itself lives in res_parking.conf -- Asterisk moved parking lot configuration out of features.conf from Asterisk 12 onward, and this checkout\'s own features.conf.sample says so on its own fifth line. Every code here is free text because Asterisk accepts any digit string including * and #, and a picker cannot know what a site has standardised on -- but a control left untouched writes nothing at all.',
    groups:[{ title:'In-call feature map', desc:'The [featuremap] section. A caller presses these during a call.', ctls:[
      ctl('fc_blindxfer','blindxfer','text','',{ placeholder:'#', info:'Blind transfer: hand the call over without speaking to the destination first.' }),
      ctl('fc_atxfer','atxfer','text','',{ placeholder:'*2', info:'Attended transfer: speak to the destination first, then complete or abort with the codes below.' }),
      ctl('fc_disconnect','disconnect','text','',{ placeholder:'*0', info:'Hang the call up from either end.' }),
      ctl('fc_automixmon','automixmon','text','',{ placeholder:'*3', info:'One-touch record. This Asterisk ships automixmon; the older automon is not in its features.conf sample, so this writes automixmon rather than a key the build would ignore.' }),
      ctl('fc_parkcall','parkcall','text','',{ placeholder:'#72', info:'One-step park: the DTMF code that triggers a park. The lot it parks into, and how long it waits there, are set below in the parking lot groups -- a different file.' })
    ]},
    { title:'Attended transfer', desc:'What the transferring party presses once an attended transfer is already up. These live in [general], not [featuremap].', ctls:[
      ctl('fc_atxferabort','atxferabort','text','',{ placeholder:'*1', info:'Cancel the transfer and return to the original caller.' }),
      ctl('fc_atxfercomplete','atxfercomplete','text','',{ placeholder:'*2', info:'Complete it and drop out.' }),
      ctl('fc_atxferthreeway','atxferthreeway','text','',{ placeholder:'*3', info:'Complete it but stay in the call, making it three-way.' }),
      ctl('fc_atxferswap','atxferswap','text','',{ placeholder:'*4', info:'Swap between the two parties.' })
    ]},
    { title:'Pickup and timing', desc:'Call pickup and how long Asterisk waits for the digits above.', ctls:[
      ctl('fc_pickupexten','pickupexten','text','',{ placeholder:'*8', info:'General call pickup: answer a colleague’s ringing phone from your own.' }),
      ctl('fc_featuredigittimeout','featuredigittimeout','slider',1000,{ min:100, max:5000, step:100, unit:' ms', info:'Longest gap between digits before Asterisk stops waiting for the rest of a feature code.' }),
      ctl('fc_transferdigittimeout','transferdigittimeout','slider',3,{ min:1, max:30, unit:' s', info:'How long to wait for the transfer destination’s digits.' }),
      ctl('fc_atxfernoanswertimeout','atxfernoanswertimeout','slider',15,{ min:5, max:120, unit:' s', info:'How long to ring the attended-transfer destination before giving up.' }),
      ctl('fc_atxferdropcall','atxferdropcall','switch',false,{ info:'When the transfer target never answers: drop the call outright, or return it to the transferrer.' })
    ]},
    { title:'Parking lot', desc:'res_parking.conf, not features.conf -- Asterisk carried this out of features.conf back in version 12, and this checkout\'s own sample says so on its own first line. The [default] lot every park lands in unless a channel names another.', ctls:[
      ctl('fc_parkeddynamic','Allow dynamically created lots','switch',false,{ info:'[general] in res_parking.conf, not the [default] lot below. Lets a channel spin up a new lot from a template at call time via the PARKINGDYNAMIC/PARKINGDYNCONTEXT/PARKINGDYNEXTEN/PARKINGDYNPOS channel variables.' }),
      ctl('fc_parkext','parkext','text','',{ placeholder:'700', info:'The extension a caller dials to park a call. Also creates the extensions for the whole parking-space range below -- leave it blank and no extensions are created at all.' }),
      ctl('fc_parkext_exclusive','parkext_exclusive','switch',false,{ info:'On restricts the parkext above to this lot alone rather than letting another lot share it.' }),
      ctl('fc_parkpos','parkpos','text','',{ placeholder:'701-720', info:'The numeric range of parking spaces this lot offers, written start-end. Leading zeros are ignored, so 00700-00720 is the same as 700-720.' }),
      ctl('fc_parkcontext','context','text','',{ placeholder:'parkedcalls', info:'The dialplan context a parked call, and the extensions created for parkext and parkpos above, live in.' }),
      ctl('fc_parkingtime','parkingtime','slider',45,{ min:10, max:600, step:5, unit:' s', info:'How long a call can sit parked before Asterisk decides nobody is coming back for it and hands it to comebacktoorigin or comebackcontext below.' }),
      ctl('fc_findslot','findslot','segmented','next',{ options:['next','first'], info:'Which parking space a new park is given: the one after the most recently used, or the lowest-numbered free space.' }),
      ctl('fc_parkedmusicclass','parkedmusicclass','text','',{ placeholder:'default', info:'Music-on-hold class played to the parked party, unless the channel already has one set directly.' })
    ]},
    { title:'Parking retrieval and timeout', desc:'What happens when somebody picks a parked call back up, and what happens when nobody does. Also res_parking.conf.', ctls:[
      ctl('fc_courtesytone','courtesytone','text','',{ placeholder:'beep', info:'Sound played on pickup, and when a one-touch record starts or stops. Left blank, no tone plays.' }),
      ctl('fc_parkedplay','parkedplay','segmented','caller',{ options:['parked','caller','both'], info:'Who hears the courtesy tone when a parked call is retrieved.' }),
      ctl('fc_parkedcalltransfers','parkedcalltransfers','segmented','no',{ options:['no','caller','callee','both'], info:'Whether DTMF transfer stays live once a parked call is retrieved, and for which side of the reconnected call.' }),
      ctl('fc_parkedcallreparking','parkedcallreparking','segmented','no',{ options:['no','caller','callee','both'], info:'Whether the retrieving side can DTMF-park the call straight back after picking it up.' }),
      ctl('fc_parkedcallhangup','parkedcallhangup','segmented','no',{ options:['no','caller','callee','both'], info:'Whether DTMF hangup stays live once a parked call is retrieved, and for which side.' }),
      ctl('fc_comebacktoorigin','comebacktoorigin','switch',true,{ info:'On: a timed-out park rings the phone that parked it back, before falling back to comebackcontext below. Off: it goes straight to comebackcontext instead.' }),
      ctl('fc_comebackdialtime','comebackdialtime','slider',30,{ min:5, max:120, unit:' s', info:'How long to ring the original parker back before giving up, when comebacktoorigin is on.' }),
      ctl('fc_comebackcontext','comebackcontext','text','',{ placeholder:'parkedcallstimeout', info:'Where a timed-out park lands in the dialplan when comebacktoorigin is off, or when ringing the parker back goes unanswered.' })
    ]}]
  },
  codecs:{ rail:'media', icon:'graphic_eq', label:'Codecs & RTP', badge:'', title:'Codecs & RTP', file:'codecs.conf · rtp.conf', kind:'generic',
    sub:'Transcoding, packetisation and the media port range. Drag the codec list to change preference order globally.',
    groups:[{ title:'Codec preference', desc:'The order Asterisk offers codecs in an SDP. Drag to reorder — there is no list to type.', ctls:[
      ctl('k_order','Global order','order',['opus','g722','ulaw','alaw','g729'],{ pool:['gsm','speex','ilbc','g726'] }),
      ctl('k_transcode','Allow transcoding','switch',true)
    ]},{ title:'RTP', desc:'Where media lands and how it survives a bad network.', ctls:[
      ctl('r_start','RTP port range start','slider',10000,{ min:1024, max:60000, step:1000 }),
      ctl('r_end','RTP port range end','slider',20000,{ min:2048, max:65000, step:1000 }),
      ctl('r_strict','strictrtp','switch',true),
      ctl('r_ice','ICE support','switch',false)
    ]}] },
  fax:{ rail:'media', icon:'fax', label:'Fax', badge:'', title:'Fax & T.38', file:'res_fax.conf', kind:'generic',
    sub:'The fax engine and the UDPTL transport T.38 rides on -- two files, each with its own Save: res_fax.conf holds the engine’s own rate limits and negotiation timeout, udptl.conf holds the port range and error-correction shape UDPTL negotiates over.',
    groups:[{ title:'Fax engine', desc:'res_fax.conf [general].', ctls:[
      ctl('fx_maxrate','Maximum rate','select','14400',{ options:['2400','4800','7200','9600','12000','14400'], info:'configs/samples/res_fax.conf.sample line 7: ;maxrate=14400 -- fastest modulation Asterisk will offer.' }),
      ctl('fx_minrate','Minimum rate','select','4800',{ options:['2400','4800','7200','9600','12000','14400'], info:'configs/samples/res_fax.conf.sample line 12: ;minrate=4800.' }),
      ctl('fx_statusevents','Send progress events to AMI','switch',true,{ info:'configs/samples/res_fax.conf.sample line 19: statusevents=yes as shipped (the sample’s own comment says default no). Completion events reach ‘call’-class managers regardless of this switch.' }),
      ctl('fx_modems','Modem capabilities','chips',['v17','v27','v29'],{ options:['v17','v27','v29'], info:'configs/samples/res_fax.conf.sample line 24: ;modems=v17,v27,v29.' }),
      ctl('fx_ecm','Error correction mode (ECM)','switch',true,{ info:'configs/samples/res_fax.conf.sample line 28: ;ecm=yes, enabled by default.' }),
      ctl('fx_t38timeout','T.38 negotiation timeout','stepper',5000,{ min:0, max:60000, unit:' ms', info:'configs/samples/res_fax.conf.sample line 32: t38timeout=5000.' }),
      ctl('fx_save','Save res_fax.conf settings','segmented','Save',{ options:['Save'], action:'fax-save', info:'Writes the six fields above to res_fax.conf on the target -- backed up first, applied through the same plan/apply transaction every other write in this console uses.' })
    ]},{ title:'T.38 / UDPTL transport', desc:'udptl.conf [general] -- a different file, so it gets its own Save.', ctls:[
      ctl('fx_udptlstart','UDPTL port range start','stepper',4000,{ min:1024, max:65534, info:'configs/samples/udptl.conf.sample line 8: udptlstart=4000.' }),
      ctl('fx_udptlend','UDPTL port range end','stepper',4999,{ min:1025, max:65535, info:'configs/samples/udptl.conf.sample line 9: udptlend=4999.' }),
      ctl('fx_udptlchecksums','UDP checksums','switch',false,{ info:'configs/samples/udptl.conf.sample line 13: ;udptlchecksums=no.' }),
      ctl('fx_udptlfecentries','FEC entries per packet','stepper',3,{ min:0, max:64, info:'configs/samples/udptl.conf.sample line 17: udptlfecentries = 3 -- error-correction entries carried in each UDPTL packet.' }),
      ctl('fx_udptlfecspan','FEC span','stepper',3,{ min:1, max:64, info:'configs/samples/udptl.conf.sample line 21: udptlfecspan = 3 -- the span parity is calculated over.' }),
      ctl('fx_udptleven','Even-numbered ports only','switch',false,{ info:'configs/samples/udptl.conf.sample line 26: use_even_ports = no -- some providers only accept an offer on an even-numbered port.' }),
      ctl('fx_udptlsave','Save udptl.conf settings','segmented','Save',{ options:['Save'], action:'fax-udptl-save', info:'Writes the six fields above to udptl.conf on the target.' })
    ]}]
  },
  cdr:{ rail:'data', icon:'receipt_long', label:'CDR & CEL', badge:'', title:'Call records', file:'cdr.conf · cel.conf', kind:'generic',
    sub:'Which backend stores records, what counts as an answered call, and which events are logged. Backends are picked, connection secrets come from secret intake.',
    groups:[{ title:'CDR', desc:'One row per call.', ctls:[
      ctl('d_enable','CDR enabled','switch',true),
      ctl('d_unanswered','Log unanswered calls','switch',false),
      ctl('d_congestion','Log congestion','switch',false),
      ctl('d_batch','Batch mode','switch',true),
      ctl('d_size','Batch size','stepper',100,{ min:1, max:1000 })
    ]},{ title:'CEL', desc:'One row per channel event — far more detail, far more volume.', ctls:[
      ctl('l_enable','CEL enabled','switch',true),
      ctl('l_events','Tracked events','chips',['CHAN_START','ANSWER','HANGUP','BRIDGE_ENTER'],{ options:['CHAN_START','CHAN_END','ANSWER','HANGUP','BRIDGE_ENTER','BRIDGE_EXIT','APP_START','APP_END','PARK_START','BLINDTRANSFER'] }),
      ctl('l_apps','Tracked applications','chips',['Dial','Queue'],{ options:['Dial','Queue','VoiceMail','ConfBridge','Playback','Park'] }),
      ctl('l_date','Timestamp format','segmented','ISO8601',{ options:['ISO8601','epoch','local'] })
    ]}] },
  ami:{ rail:'data', icon:'api', label:'AMI & ARI', badge:'2', title:'Manager & REST interfaces', file:'manager.conf · ari.conf · http.conf', kind:'table',
    sub:'Machine access to the PBX. Permissions are checkbox matrices, never a comma string you have to remember.',
    table:{ add:'New API user', grid:'1fr 1fr 1.6fr 110px', cols:['User','Interface','Permissions','State'],
      rows:[['monitor','AMI','system, call, log','Connected'],['dialer','AMI','originate, call','Connected'],['stasis-app','ARI','applications, channels','Connected']] },
    groups:[{ title:'HTTP server', desc:'ARI and the built-in web sockets ride on this.', ctls:[
      ctl('a_http','HTTP enabled','switch',true),
      ctl('a_port','Bind port','stepper',8088,{ min:1, max:65535 }),
      ctl('a_tls','TLS enabled','switch',true),
      ctl('a_tlsport','TLS port','stepper',8089,{ min:1, max:65535 }),
      ctl('a_origin','Allowed origins','chips',['https://console.local'],{ options:['https://console.local','https://ops.example','*'] })
    ]},{ title:'Manager permissions', desc:'Tick the classes this user may read or write.', ctls:[
      ctl('a_read','Read classes','chips',['system','call','log'],{ options:['system','call','log','verbose','command','agent','user','config','dtmf','reporting','cdr','dialplan','originate','message'] }),
      ctl('a_write','Write classes','chips',['call'],{ options:['system','call','log','verbose','command','agent','user','config','originate','message'] }),
      ctl('a_deny','Deny by default','switch',true),
      ctl('a_timeout','Idle timeout','slider',300,{ min:30, max:3600, step:30, unit:'s' })
    ]}] },
  modules:{ rail:'sys', icon:'extension', label:'Modules', badge:'214', title:'Modules', file:'modules.conf', kind:'table',
    sub:'Every loadable module with its live state. Loading and unloading are real actions and run the full confirmation ceremony.',
    table:{ add:'Load module', grid:'1.3fr 1fr 1fr 120px', cols:['Module','Type','Use count','State'],
      rows:[['res_pjsip.so','Resource','48','Running'],['app_queue.so','Application','6','Running'],['chan_iax2.so','Channel','1','Running'],['cdr_odbc.so','CDR backend','1','Running'],['res_stir_shaken.so','Resource','0','Not loaded'],['app_confbridge.so','Application','3','Running']] },
    groups:[{ title:'Load policy', desc:'What Asterisk does with modules it was not explicitly told about.', ctls:[
      ctl('mo_auto','autoload','switch',true),
      ctl('mo_preload','Preload','chips',['res_odbc.so','res_config_odbc.so'],{ options:['res_odbc.so','res_config_odbc.so','res_curl.so','res_crypto.so'] }),
      ctl('mo_noload','Never load','chips',['chan_sip.so'],{ options:['chan_sip.so','chan_mobile.so','app_meetme.so','res_snmp.so'] }),
      ctl('mo_require','Fail startup on missing module','switch',true)
    ]}] },
  logger:{ rail:'sys', icon:'article', label:'Logger', badge:'', title:'Logging', file:'logger.conf', kind:'generic',
    sub:'Severity per destination as a matrix of switches. Rotation is a picker, retention is a slider.',
    groups:[{ title:'Console', desc:'What the attached console prints.', ctls:[
      ctl('g_console','Console levels','chips',['notice','warning','error'],{ options:['debug','trace','notice','warning','error','verbose','dtmf','fax','security'] }),
      ctl('g_verbose','Verbosity','slider',3,{ min:0, max:10 })
    ]},{ title:'Files & rotation', desc:'Disk logging.', ctls:[
      ctl('g_file','File levels','chips',['notice','warning','error','verbose'],{ options:['debug','trace','notice','warning','error','verbose','dtmf','fax','security'] }),
      ctl('g_rotate','Rotation strategy','segmented','rotate',{ options:['sequential','rotate','timestamp','none'] }),
      ctl('g_queue','Queue log','switch',true)
    ]}] },
  security:{ rail:'sys', icon:'shield', label:'Security', badge:'!', title:'Security', file:'acl.conf', kind:'table',
    sub:'Named access control lists, listed in the exact order Asterisk evaluates them -- the LAST matching rule wins, which is what makes a broad deny followed by a narrow permit work as an allowlist. TLS certificate and key paths below are typed, not chosen from a store this console does not have -- it can point Asterisk at a certificate and check the wiring looks sane, but it cannot install, generate or rotate one.',
    table:{ add:'Add rule', grid:'1fr 110px 1.6fr', cols:['ACL rule','Action','Network / CIDR'], rows:[] },
    groups:[{ title:'Add a rule', desc:'Appended to the end of the named ACL below, so it is the rule that decides the outcome for anything it matches. Click an existing rule in the table to load it here for editing instead.', ctls:[
      ctl('s_aclname','ACL name','text','trusted-nets',{ info:'The named list this rule joins, e.g. "trusted-nets". A name that does not already exist creates that ACL with this as its first rule.' }),
      ctl('s_action','Action','segmented','permit',{ options:['permit','deny'] }),
      ctl('s_spec','Network / CIDR','text','',{ info:'A bare address ("203.0.113.4") or address/mask ("10.20.0.0/16", "203.0.113.0/24", "::1/128"). A hostname is refused: Asterisk resolves an ACL address at load time and this console cannot verify one offline.' })
    ]},{ title:'Auto-ban', desc:'This console’s own behaviour, not an Asterisk setting: persisted here, and never written to acl.conf or anywhere else on the target.', ctls:[
      ctl('s_failban','Auto-ban after failures','stepper',5,{ min:0, max:100 }),
      ctl('s_bantime','Ban duration','slider',600,{ min:60, max:86400, step:60, unit:'s' })
    ]},{ title:'TLS', desc:'A PJSIP transport’s own TLS listener, in pjsip.conf. Type the section name of an existing transport (e.g. "transport-tls"), press Load to see what it currently has, edit, then Save -- this edits a transport already declared on the target, it does not create one.', ctls:[
      ctl('s_transport','Transport name','text','',{ info:'The pjsip.conf [section] these fields read and write. Must already exist with type=transport; Save refuses a name that does not match one.' }),
      ctl('s_tload','Load from target','segmented','Load',{ options:['Load'], action:'security-transport-load', info:'Reads the named transport’s current TLS settings from pjsip.conf into the fields below.' }),
      ctl('s_tprotocol','Protocol','segmented','tls',{ options:['udp','tcp','tls','ws','wss','flow'] }),
      ctl('s_tcert','Certificate file','text','',{ placeholder:'/path/mycert.crt' }),
      ctl('s_tprivkey','Private key file','text','',{ placeholder:'/path/mykey.key' }),
      ctl('s_tcalistfile','CA list file','text','',{ info:'Required for either verification switch below -- without one, a client or server certificate can never actually be verified.' }),
      ctl('s_tcalistpath','CA list path','text','',{ info:'A directory of certificates, as an alternative to the file above.' }),
      ctl('s_tcipher','Cipher list','text','',{ placeholder:'ADH-AES256-SHA,ADH-AES128-SHA' }),
      ctl('s_tmethod','Method','text','',{ placeholder:'tlsv1', info:'The only value the shipped sample documents. PJPROJECT accepts others; this console does not offer a list it cannot verify against a real build.' }),
      ctl('s_tverifyclient','Verify client certificate','switch',false),
      ctl('s_tverifyserver','Verify server certificate','switch',false),
      ctl('s_treqclientcert','Require client certificate','switch',false),
      ctl('s_tsave','Save transport TLS settings','segmented','Save',{ options:['Save'], action:'security-transport-save' })
    ]},{ title:'STIR/SHAKEN', desc:'Signed caller identity for outbound calls.', ctls:[
      ctl('s_stir','Attestation enabled','switch',true),
      ctl('s_level','Attestation level','segmented','A',{ options:['A','B','C'], info:'A means you know the caller and their right to that number. C means the call just passed through you.' }),
      ctl('s_verifyin','Verify inbound identity','switch',true),
      ctl('s_failaction','On verification failure','segmented','Continue',{ options:['Continue','Tag','Reject'] })
    ]},{ title:'STIR/SHAKEN keys', desc:'The private key Asterisk signs outgoing Identity headers with, and the certificate-authority material used to verify incoming ones -- a telephone-number issuing authority hands you these, this console only points Asterisk at them.', ctls:[
      ctl('s_privkey','Signing private key file','text','',{ placeholder:'/var/lib/asterisk/keys/stir_shaken/tns/multi-tns-key.pem', info:'Must not be group- or world-readable; the account the asterisk process runs as must own it.' }),
      ctl('s_certurl','Signing certificate URL','text','',{ placeholder:'https://example.com/tncerts/multi-tns-cert.pem', info:'Published by the issuing authority. Make sure whatever this URL serves is the certificate alone -- never the private key too.' }),
      ctl('s_loadsyscerts','Trust the system CA store','switch',false),
      ctl('s_cafile','Verification CA file','text','',{ info:'One or more CA certificates in PEM format, verifying the chain of trust for an inbound Identity header’s certificate. At least one of this and the directory below is required for verification to do anything.' }),
      ctl('s_capath','Verification CA directory','text','',{ info:'A directory of hashed CA certificates -- an alternative to the file above.' }),
      ctl('s_stirsave','Save STIR/SHAKEN settings','segmented','Save',{ options:['Save'], action:'security-stir-save' })
    ]}] },
  cli:{ rail:'sys', icon:'terminal', label:'CLI builder', badge:'', title:'CLI builder', file:'asterisk -rx', kind:'cli',
    sub:'Build a real Asterisk CLI command by choosing its parts. The raw console beside it is read-only output, shown only in expert mode.', groups:[] },
  memory:{ rail:'agent', icon:'database', label:'Memory console', badge:'2.4k', title:'Memory console', file:'agent global memory', kind:'memory',
    sub:'Search the memory corpus with a visual regex builder, and watch the sync, attestation and emission guard state alongside it.', groups:[] },
  sync:{ rail:'agent', icon:'sync', label:'Sync & attestation', badge:'ok', title:'Sync & attestation', file:'agent-memory-sync', kind:'table',
    sub:'Every sync run, its attestation and its backup. A failed attestation blocks the next write until it is acknowledged here.',
    table:{ add:'Run sync now', grid:'1fr 1fr 1fr 1fr 120px', cols:['Run','Started','Records','Backup','Attestation'],
      rows:[['r-4821','08:14:02','2,412','verified','Signed'],['r-4820','07:14:01','2,410','verified','Signed'],['r-4819','06:14:03','2,410','verified','Signed'],['r-4818','05:14:02','2,407','verified','Signed']] },
    groups:[{ title:'Schedule', desc:'When the console pushes memory upstream.', ctls:[
      ctl('y_auto','Automatic sync','switch',true),
      ctl('y_every','Interval','slider',60,{ min:5, max:1440, step:5, unit:' min' }),
      ctl('y_backup','Backup before write','switch',true),
      ctl('y_attest','Require attestation','switch',true),
      ctl('y_retain','Keep backups','stepper',30,{ min:1, max:365 })
    ]}] },
  skills:{ rail:'agent', icon:'auto_awesome', label:'Skills registry', badge:'26', title:'Skills registry', file:'skills/', kind:'table',
    sub:'Installed agent skills with their trigger scope. Enabling a skill is a switch; nothing about a skill is typed here.',
    table:{ add:'Install skill', grid:'1.2fr 1.6fr 100px 110px', cols:['Skill','Description','Scope','State'],
      rows:[['multi-agent-orchestration','Multi-lane orchestration','global','Enabled'],['status-protocol','Hub session protocol','global','Enabled'],['status-client','Client wiring recipes','project','Enabled'],['headless-verification','Headless verification','global','Enabled'],['cleanup-presentation','Presentation contract','project','Disabled']] },
    groups:[{ title:'Orchestration', desc:'Multi-agent lane defaults.', ctls:[
      ctl('u_lanes','Maximum parallel lanes','stepper',4,{ min:1, max:12 }),
      ctl('u_isolate','Isolated worktree per lane','switch',true),
      ctl('u_model','Lane model override','select','gpt-5.6-luna',{ options:['gpt-5.6-luna','inherit'] }),
      ctl('u_verify','Verification panel for high-risk lanes','switch',true),
      ctl('u_destruct','Keep destructive actions with orchestrator','switch',true)
    ]}] },
  hub:{ rail:'agent', icon:'hub', label:'Status hub', badge:'3', title:'Status hub sessions', file:'status-hub', kind:'table',
    sub:'Open sessions, their questions and reply state. The ingest token lives in the trusted process and is never shown in this window.',
    table:{ add:'Open session', grid:'1fr 1.4fr 90px 110px', cols:['Session','Subject','❓s','State'],
      rows:[['s-2201','Asterisk console build','2','Awaiting reply'],['s-2200','Memory sync drift','0','Active'],['s-2199','Release packaging','1','Awaiting reply']] },
    groups:[{ title:'Session policy', desc:'How the console behaves as a hub client.', ctls:[
      ctl('b_poll','Reply poll interval','slider',15,{ min:5, max:300, unit:'s' }),
      ctl('b_notify','Desktop notification on reply','switch',true),
      ctl('b_close','Auto-close idle sessions','switch',false),
      ctl('b_report','Report worktree state each run','switch',true)
    ]}] },
  vocab:{ rail:'agent', icon:'policy', label:'Vocabulary & guard', badge:'lock', title:'Vocabulary & emission guard', file:'vocabulary-dictionary.json', kind:'table',
    sub:'Terms are read from a dictionary JSON you upload from this machine. Nothing is bundled, nothing is sent anywhere, and the table stays empty until you load a file.',
    table:{ add:'Add term', grid:'1fr 1fr 1fr 110px', cols:['Term','Alias','Plural','Lock'],
      rows:[], empty:'No terms loaded. Upload a local dictionary JSON to populate this table.' },
    groups:[{ title:'Emission guard', desc:'Runs on every string the app is about to write or display.', ctls:[
      ctl('n_guard','Guard enabled','switch',true),
      ctl('n_mode','On violation','segmented','Block',{ options:['Warn','Block','Rewrite'] }),
      ctl('n_scan','Scan surfaces','chips',['UI text','Logs','Exports'],{ options:['UI text','Logs','Exports','Clipboard','Telemetry'] }),
      ctl('n_lock','Vocabulary lock','switch',true),
      ctl('n_drift','Report drift daily','switch',true)
    ]}] },
  ops:{ rail:'agent', icon:'rocket_launch', label:'Operations', badge:'v3.2', title:'Operations & releases', file:'release', kind:'table',
    sub:'Release history and the update feed. Packages are unsigned by policy; the console says so plainly rather than implying verification.',
    table:{ add:'Cut release', grid:'1fr 1fr 1fr 1fr 110px', cols:['Version','Published','Artifacts','Duration','State'],
      rows:[['3.2.0','today 08:41','Setup, RELEASES, nupkg','06:12','Published'],['3.1.4','2 days ago','Setup, RELEASES, nupkg, delta','05:48','Published'],['3.1.3','5 days ago','Setup, RELEASES, nupkg','06:31','Published']] },
    groups:[{ title:'Updates', desc:'Unsigned artifacts. The operating system may warn about an unknown publisher — that is expected.', ctls:[
      ctl('o_check','Check for updates','segmented','On start + hourly',{ options:['On start','On start + hourly','Manual'] }),
      ctl('o_stage','Stage in background','switch',true),
      ctl('o_restart','Install on next restart','switch',true),
      ctl('o_channel','Channel','segmented','Stable',{ options:['Stable','Beta'] }),
      ctl('o_hash','Verify package hashes','switch',true)
    ]}] },
  secrets:{ rail:'agent', icon:'key', label:'Secret intake', badge:'6', title:'Secret intake', file:'templates/secret-intake', kind:'table',
    sub:'Credentials are captured once through the intake flow and referenced by name everywhere else. No secret value is ever rendered.',
    table:{ add:'Intake a secret', grid:'1fr 1fr 1fr 110px', cols:['Name','Used by','Rotated','State'],
      rows:[['carrier-primary-auth','pjsip trunk','12 days ago','Sealed'],['odbc-cdr','cdr_odbc','30 days ago','Sealed'],['ari-stasis','ari','4 days ago','Sealed'],['hub-ingest','status hub','1 day ago','Sealed']] },
    groups:[{ title:'Handling', desc:'Storage and rotation rules for everything in the intake.', ctls:[
      ctl('x_store','Storage','segmented','OS keychain',{ options:['OS keychain','Encrypted file'] }),
      ctl('x_rotate','Rotation reminder','slider',90,{ min:7, max:365, unit:' days' }),
      ctl('x_mask','Mask in all surfaces','switch',true),
      ctl('x_export','Allow export','switch',false)
    ]}] },
  servers:{ rail:'app', icon:'dns', label:'Deploy & servers', badge:'3', title:'Deploy a server', file:'provisioning', kind:'servers',
    sub:'This is the main road: press the big button and a working PBX exists in about seven seconds. Connecting to a PBX somebody else built is underneath, and it is the side road.',
    table:{ add:'New connection', grid:'1fr 1fr 1.2fr 1fr 120px', cols:['Profile','Route','Target','Interface','State'],
      rows:[['pbx-hq','SSH','asterisk-ops@pbx-hq.internal','AMI 5038 TLS','Connected'],['pbx-lab','Local Docker','asterisk-lab','AMI 5038','Connected'],['pbx-edge','SSH Docker','asterisk-edge @ 10.20.4.10','ARI 8089 TLS','Unregistered']] },
    groups:[{ title:'Host the console here', desc:'Install this console onto the machine described below, so it runs beside Asterisk and is administered from a browser -- the way FreePBX is. It installs into paths it creates itself and never touches Asterisk\u2019s own configuration or service.', ctls:[
      ctl('dp_status','What will happen','text','',{ action:'deploy-status', info:'Names the machine it would install onto, the account it would use, and what is missing if anything is. Every step is shown as it runs, because installing over a network is slow enough that silence reads as a hang.' }),
      ctl('dp_go','Install the console on this machine','switch',false,{ info:'Checks the machine answers and that the account can install a service BEFORE sending anything, so a fifteen-minute upload is never the thing that discovers a password prompt. A host key that has changed stops it outright: the last step runs a privileged installer, and that is the wrong moment to trust a key nobody recognises.' })
    ] },
    { title:'Route', desc:'How this console reaches Asterisk. Everything below reshapes itself around this answer.', ctls:[
      ctl('sv_kind','Connection type','segmented','Local',{ options:['Local','Local Docker','SSH','SSH Docker'], info:'Local is the same machine. Local Docker is a container here. SSH is another machine. SSH Docker is a container on another machine, reached over SSH and then into the container.' }),
      ctl('sv_host','Host','select','pbx-hq.internal',{ options:['localhost','pbx-hq.internal','pbx-branch.internal','10.20.4.10'] }),
      ctl('sv_container','Container','select','asterisk-prod',{ options:['asterisk-prod','asterisk-lab','asterisk-edge'] }),
      ctl('sv_user','SSH user','select','asterisk-ops',{ options:['asterisk-ops','root','deploy'] }),
      ctl('sv_sshport','SSH port','stepper',22,{ min:1, max:65535 }),
      ctl('sv_hostkey','Strict host key checking','switch',true,{ info:'On means a changed host key aborts the connection instead of asking you to accept it. That prompt is how people get compromised.' })
    ]},{ title:'Manager interface', desc:'AMI for live events and CLI, ARI for Stasis applications.', ctls:[
      ctl('sv_iface','Interface','segmented','AMI',{ options:['AMI','ARI','Both'] }),
      ctl('sv_amiport','Manager port','stepper',5038,{ min:1, max:65535 }),
      ctl('sv_tls','TLS','switch',true),
      ctl('sv_forward','Forward through the SSH tunnel','switch',true),
      ctl('sv_watch','Reconnect automatically','switch',true),
      ctl('sv_readonly','Open read-only','switch',false)
    ]},{ title:'Phone system', desc:'Asterisk itself on the connected target, separate from the console that is talking to it.', ctls:[
      ctl('da_status','Status','text','Unknown — no target connected yet.',{ action:'daemon-status', info:'Whether Asterisk on the connected target is up and answering the manager interface right now.' }),
      ctl('da_start','Start','segmented','Start',{ options:['Start'], action:'daemon-start', info:'Starts Asterisk on the connected target if it is not already answering.' }),
      ctl('da_stop','Stop','segmented','Stop',{ options:['Stop'], action:'daemon-stop', info:'Stops Asterisk on the connected target. Every call in progress ends.' }),
      ctl('da_restart','Restart','segmented','Restart',{ options:['Restart'], action:'daemon-restart', info:'Stops and starts Asterisk on the connected target. Every call in progress ends.' })
    ]}] },
  notifications:{ rail:'app', icon:'notifications', label:'Notifications', badge:'4', title:'Notification centre', file:'console', kind:'table',
    sub:'Every non-blocking notification the console has raised, reviewable after the fact so nothing important disappears with a toast.',
    table:{ add:'Mark all read', grid:'1fr 2fr 1fr 110px', cols:['Source','Message','When','State'],
      rows:[['pjsip','Endpoint 1003 became unreachable','08:41','Unread'],['sync','Memory sync r-4821 attested','08:14','Read'],['ops','Release 3.2.0 published (unsigned)','08:41','Read'],['queue','support breached service level for 90s','07:58','Unread']] },
    groups:[{ title:'Delivery', desc:'What interrupts you and what merely gets recorded.', ctls:[
      ctl('nt_toast','Show toasts','switch',true),
      ctl('nt_sound','Play a sound','switch',false),
      ctl('nt_levels','Notify on','chips',['Errors','Warnings'],{ options:['Errors','Warnings','Info','Every change'] }),
      ctl('nt_quiet','Quiet hours','switch',false),
      ctl('nt_keep','Keep history for','slider',30,{ min:1, max:365, unit:' days' })
    ]}] },
  history:{ rail:'app', icon:'history', label:'History & git', badge:'', title:'History', file:'/etc/asterisk/.git', kind:'history',
    sub:'Every control you touch commits to a local git repository the moment you touch it. This screen is the full history: the commit graph, the exact diff, blame per option, branches for trying things out, and a restore that runs the four gates.',
    groups:[{ title:'Commit behaviour', desc:'What happens on every single change.', ctls:[
      ctl('hi_commit','Commit on every change','switch',true,{ info:'On means each toggle, slider and picker writes a real git commit against the configuration directory. Off batches changes until you commit by hand — which is how people lose track of what they changed.' }),
      ctl('hi_msg','Commit message style','segmented','Descriptive',{ options:['Terse','Descriptive','Conventional'] }),
      ctl('hi_author','Attribute commits to','segmented','Signed-in user',{ options:['Signed-in user','Console','Both'] }),
      ctl('hi_sign','Sign commits','switch',false),
      ctl('hi_push','Mirror to a remote','switch',false),
      ctl('hi_hook','Run asterisk config validation as a pre-commit hook','switch',true)
    ]},{ title:'Retention & safety', desc:'How much history is kept and what a restore does.', ctls:[
      ctl('hi_keep','Keep commits','stepper',500,{ min:10, max:5000 }),
      ctl('hi_gc','Garbage collect monthly','switch',true),
      ctl('hi_diff','Show a diff before restoring','switch',true),
      ctl('hi_branch','Restore onto a new branch instead of main','switch',true),
      ctl('hi_reload','Reload Asterisk after a restore','switch',true)
    ]}] },
  arcade:{ rail:'app', icon:'stadia_controller', label:'Arcade', badge:'', title:'Confirmation credits', file:'arcade', kind:'arcade',
    sub:'The four-gate ceremony is thorough and, twelve times a day, exhausting. Win credits here and spend one to skip a ceremony. Credits are earned, never bought with money, and destructive actions above the danger line always cost two.',
    groups:[{ title:'Spending rules', desc:'How credits are allowed to replace a ceremony.', ctls:[
      ctl('cr_enable','Allow credits to skip ceremonies','switch',true),
      ctl('cr_cost','Cost per skip','stepper',1,{ min:1, max:5 }),
      ctl('cr_danger','High-danger actions still need the full ceremony','switch',true,{ info:'Restarting Asterisk, unloading a module and deleting an endpoint are above the danger line. Leave this on unless you enjoy explaining outages.' }),
      ctl('cr_cap','Maximum credits held','stepper',20,{ min:1, max:99 }),
      ctl('cr_expire','Credits expire after','slider',7,{ min:1, max:90, unit:' days' })
    ]}] },
  customise:{ rail:'app', icon:'auto_awesome', label:'Customise everything', badge:'∞', title:'Customise everything', file:'console profile', kind:'generic',
    sub:'The global layer. Every one of these reaches across the whole console, and every individual element can still override it from its own right-click menu.',
    groups:[{ title:'Identity', desc:'What this console calls itself on screen. The name is a label like every other label here, so it is yours to change.', ctls:[
      ctl('id_name','Display name','text','',{ placeholder:'Ding PBX Console', info:'Changes the title bar, the About screen and notifications. It does not move your data, your saved servers or your credentials, and diagnostics and bug reports still say Ding PBX Console so anyone reading one knows what software it came from.' }),
      ctl('id_name_reset','Restore the shipped name','switch',false,{ info:'Switch this on to go back to Ding PBX Console in one action.' })
    ]},
    { title:'External editor', desc:'Hand a config file or an export to the editor you already use. The console works fully without one; this is a convenience, not something it needs.', ctls:[
      ctl('ed_choice','Editor','select','Visual Studio Code',{ options:['Visual Studio Code','Notepad++','Sublime Text','Notepad'], info:'Only editors actually installed on this machine are offered. If yours is missing, add it below by browsing for its executable.' }),
      ctl('ed_custom_name','Other editor name','text','',{ placeholder:'My editor' }),
      ctl('ed_custom_path','Other editor executable','text','',{ placeholder:'C:\tools\editor.exe', info:'The program itself, not a command line. Browse for it rather than typing it if you are not sure; quotes and shell operators are refused because this launches a program directly rather than through a shell.' }),
      ctl('ed_clear','Forget the chosen editor','switch',false)
    ]},
    { title:'Support Tickets', desc:'Locked out of something and cannot remember the credential? Open a ticket. Nothing here is sent anywhere: the ticket exists only on this computer, no network request is made, no data is collected, and nobody is reading it.', ctls:[
      ctl('sup_category','Category','select','Forgotten PIN or password',{ options:['Locked out of an element','Forgotten PIN or password','Lost my authenticator','Something else'] }),
      ctl('sup_severity','Severity','segmented','Normal',{ options:['Low','Normal','High','Catastrophic'], info:'Choose freely. No severity here is honoured by anybody, because nobody is reading it.' }),
      ctl('sup_description','What happened','text','',{ placeholder:'I cannot remember the PIN', info:'Nobody will read it, but the form insists.' }),
      ctl('sup_open','Open a ticket','switch',false,{ info:'Files the ticket locally and shows the resolution: this console opens your application-data folder so you can delete it yourself. Deleting it clears every toy lock on this machine, not only the one you are locked out of, along with your saved settings. Toy locks were never security, and this is the reset that was always available.' })
    ]},
    { title:'Deploy progress', desc:'What a running deploy is doing, reported step by step as it happens rather than announced when it finishes.', ctls:[
      ctl('dp_progress','Latest deploy step','text','No deploy has run in this session.',{ action:'deploy-progress', info:'Each step is reported after its work, never before, so a line here describes something that has already happened. A failure stops the count rather than continuing as though the deploy were still going.' })
    ]},
    { title:'Readability', desc:'Whether the colour you have chosen can actually be read against the console’s own surface. Measured, not guessed: this is the WCAG contrast ratio for the current accent, and it changes as you move the colour.', ctls:[
      ctl('ap_contrast_status','Contrast of the current accent','text','Not measured yet.',{ action:'contrast-status', info:'The ratio and the level it reaches. AA needs 4.5 for ordinary text and 3 for large text; AAA needs 7 and 4.5. A colour that fails is still yours to keep -- this reports, it does not refuse.' })
    ]},
    { title:'Settings sources', desc:'Let a setting take its value from somewhere else -- an HTTPS API you run, or a Home Assistant boolean. The value is an override for as long as the source says so; your own setting is what returns when it stops, and a source going offline never resets anything.', ctls:[
      ctl('src_url','Source URL','text','',{ placeholder:'https://settings.example.net/console', info:'HTTPS only, except loopback while developing. Credentials cannot go in the URL -- a URL reaches logs and error messages. The host must also be on the allowed list, so a tampered settings file cannot repoint this at an internal address.' }),
      ctl('src_kind','Source kind','segmented','https-api',{ options:['https-api','home-assistant'] }),
      ctl('src_entity','Home Assistant entity','text','',{ placeholder:'input_boolean.quiet_hours', info:'The boolean entity whose state drives this source. Off is an ordinary state, not a failure: it means the source simply does not apply and your own values stay in effect.' }),
      ctl('src_keys','Settings this source may set','text','',{ placeholder:'lang_mode, fun_level', info:'Comma separated. A key not listed here is ignored however it arrives, because what a response is permitted to change is decided here and not there.' }),
      ctl('src_credential','Credential vault key','text','',{ placeholder:'ding-pbx-console/source/1', info:'Names where the token lives. The token itself never passes through this console’s own state, and is sent as a header by the privileged process rather than by this screen.' }),
      ctl('src_add','Add this source','switch',false),
      ctl('src_clear','Remove every source','switch',false,{ info:'Your own settings are unaffected -- a source only ever overrode them.' }),
      ctl('src_status','Sources in effect','text','No sources configured.',{ action:'source-status', info:'What each source last answered, and when. A source that has stopped working says so rather than quietly ceasing to track.' })
    ]},
    { title:'Allowed source hosts', desc:'A settings source may only reach a host you have explicitly allowed here. The list starts empty, which refuses every source rather than permitting every source -- a tampered settings file cannot repoint a source at an internal address you never agreed to. Changes here take effect after the console restarts.', ctls:[
      ctl('src_allow_host','Host to allow or remove','text','',{ placeholder:'settings.example.net', info:'A bare hostname only -- no scheme, path, port, or credentials. This is compared against the Source URL above before any request is made.' }),
      ctl('src_allow_add','Allow this host','switch',false),
      ctl('src_allow_remove','Remove this host','switch',false),
      ctl('src_allow_status','Hosts allowed','text','No hosts are allowed yet -- every external settings source is refused until you add one. Changes take effect after a restart.',{ action:'settings-source-allowlist-status', info:'Every host a settings source is currently permitted to reach. A source whose host is not on this list is refused before any request is made, however it is configured above.' })
    ]},
    { title:'Scheduled settings', desc:'Settings that change themselves at a time you choose, and change back when the window ends. A scheduled change goes through exactly the same path as one you make by hand, so it is validated and recorded the same way.', ctls:[
      ctl('sch_status','What is in force now','text','No schedule is in force; your own settings are in effect.',{ action:'schedule-status', info:'Names the rules currently applying and the settings they are overriding. Your own values are never overwritten -- they are put back when the window ends, including if you delete the rule while it is running.' })
    ]},
    { title:'Console mark', desc:'The logo this console shows for itself. A shipped mark, or a picture of your own. It changes what you see and nothing else -- not where your settings live, not the installer, not the update feed.', ctls:[
      ctl('logo_preset','Shipped mark','select','Ding',{ options:['Ding','Ding, single colour','Handset'], info:'Bundled locally, never fetched, so the mark is not a network request on every launch.' }),
      ctl('logo_pick','Your own picture','file','',{ accept:'image/png,image/jpeg,image/webp,image/svg+xml', info:'The bytes decide what the file is, never its name or the type the picker reports -- both are claims made by whoever produced it. The size is read from the header before anything decodes, because a decompression bomb is small on disk and enormous in memory. The file is read here in the console, which needs no privilege to open anything else.' }),
      ctl('logo_reset','Back to the shipped mark','switch',false,{ info:'One action, always available, whatever state the custom mark is in.' }),
      ctl('logo_status','What is in use','text','The shipped mark.',{ action:'logo-status', info:'Names the mark actually in use, and states plainly what a rejected picture did not change: a file that fails any check leaves the previous mark exactly as it was.' })
    ]},
    { title:'Attention', desc:'Five accommodations, each independent and each off until you switch it on. They change how the interface behaves, nothing else, and none of them says anything about you.', ctls:[
      ctl('att_focus','Focus','switch',false,{ info:'Dims everything except what you are working on. Nothing is hidden; the rest is still one click away.' }),
      ctl('att_low','Low stimulation','switch',false,{ info:'Fewer moving things, quieter colour, and only the notifications that genuinely need a person. If your system already asks for reduced motion, that is honoured whether or not this is on.' }),
      ctl('att_time','Time awareness','switch',false,{ info:'Shows how long this session has been open and how long since anything changed, where the work is.' }),
      ctl('att_one','One thing at a time','switch',false,{ info:'Keeps one next action visible, chosen by you. It survives a context switch.' }),
      ctl('att_momentum','Momentum','switch',false,{ info:'A dismissible prompt when something has been untouched for a while. Saying not now is respected for half an hour, not for thirty seconds.' })
    ]},
    { title:'Dialogs', desc:'Decoration in dialogs and message boxes.', ctls:[
      ctl('dlg_emoji','Show emojis in dialogs and message boxes','switch',false,{ info:'Adds one relevant emoji to a dialog’s heading and body. Never to a button, an action label or an accessible name: a screen reader announces an emoji by its Unicode description, so a decorated button would be heard on every focus. The wording is identical either way.' })
    ]},
    { title:'Language', desc:'Which language the console speaks. Bilingual keeps English primary and adds the Cantonese beside it. Technical identifiers -- codecs, config keys, section names, SIP URIs -- stay literal in every mode, because they have to survive being read back and typed.', ctls:[
      ctl('lang_mode','Language','segmented','English',{ options:['English','廣東話','English + 廣東話'], info:'A string with no translation yet renders as English rather than as a placeholder, so an incomplete catalog looks unfinished instead of broken.' })
    ]},{ title:'School mode', desc:'A shared, renamable switch for plain English presentation. It hides Cantonese, funny-level, vocabulary and dim-sum capabilities while active, and restores your earlier choices after a verified unlock.', ctls:[
      ctl('school_mode','School mode','switch',false,{ info:'This is a shared presentation mode, not a security boundary. Turning it on forces English and removes playful or optional controls everywhere this console runs.' }),
      ctl('school_name','School mode name','text','',{ placeholder:'School mode', info:'Rename the mode shown in every surface. The chosen name is shared and updates live.' }),
      ctl('school_credential','Unlock credential','text','',{ placeholder:'Type a PIN or password', info:'Typed here, used once, and cleared the moment it is used -- it is never kept in the console’s own state, so it cannot reach an export or a screenshot. Only a digest of it is stored. This is a presentation lock, not security: deleting the shared local application-data record resets it whatever you set here.' }),
      ctl('school_method','Credential kind','segmented','pin',{ options:['pin','password'] }),
      ctl('school_set_credential','Set unlock credential','switch',false,{ info:'Opens a local credential prompt. The credential is kept by the desktop credential store, never in settings, exports or history.' }),
      ctl('school_unlock','Unlock School mode','switch',false,{ info:'Verifies the shared credential before restoring the previous language and funny levels. The ladder never bypasses this credential.' }),
      ctl('school_status','School mode status','text','Unknown',{ action:'school-status', info:'Shows the shared state and whether the last cross-process refresh answered.' })
    ]},{ title:'Fun', desc:'Two independent settings style every message without changing its facts. Both start at level 5, and each can be reset separately.', ctls:[
      ctl('fun_level','Fun level (English)','slider',5,{ min:1, max:5, info:'1 is a bank. 2 is polite. 3 is warm. 4 adds jokes and bolder motion. 5 is confetti for changing a slider, rainbow fills and an app that will not stop congratulating you. This styles every message including warnings and errors, and there is no category it skips -- what it never changes is what a message says: which file, which account, which action cannot be undone, and what an error actually was.' }),
      ctl('fun_level_yue','Fun level (廣東話)','slider',5,{ min:1, max:5, info:'The same dial for Cantonese, kept separate on purpose: somebody may want the Cantonese warm and the English flat for a colleague reading over their shoulder, and one shared slider makes that impossible. Both start at 5 and either can be reset on its own.' }),
      ctl('fun_copy','Copy tone','segmented','Warm',{ options:['Terse','Neutral','Warm','Comedian'] }),
      ctl('fun_celebrate','Celebrate on','chips',['Big wins','Security improvements'],{ options:['Every change','Big wins','Security improvements','Minigame wins','Nothing'] }),
      ctl('fun_confetti','Confetti density','slider',90,{ min:0, max:300, unit:' pieces' }),
      ctl('fun_sound','Sound effects','switch',false),
      ctl('fun_mascot','Show the mascot','switch',false),
      ctl('fun_easter','Allow hidden surprises','switch',true),
      ctl('fun_random','Random appearance for every element','switch',false,{ info:'On, every rendered element is given its OWN randomly generated appearance — its own colour, radius, weight, shadow and entrance. Nothing shares a look. Turn it off and everything snaps back to the design system; your manual per-element overrides survive either way.' }),
      ctl('fun_random_seed','Randomness seed','stepper',1,{ min:1, max:999 }),
      ctl('fun_random_scope','Randomise','chips',['Colour','Radius','Shadow'],{ options:['Colour','Radius','Shadow','Type weight','Size','Rotation','Entrance animation'] }),
      ctl('fun_random_strength','How wild','slider',40,{ min:5, max:100, unit:'%' }),
      ctl('fun_random_reroll','Reroll on every screen change','switch',false)
    ]},{ title:'Narration', desc:'An off-by-default spoken narrator for app events. English and Cantonese voices are independent, both is serialized English then Cantonese, and quiet or screen-reader states suppress speech.', ctls:[
      ctl('nar_enabled','Narration','switch',false,{ info:'Narration is off until you turn it on. It reads app events through the platform speech engine and never blocks the interface.' }),
      ctl('nar_language','Narrated language','segmented','English',{ options:['English','廣東話','Both'], info:'Both speaks English first and Cantonese second, one utterance at a time.' }),
      ctl('nar_en_voice','English voice','select','Choose automatically',{ options:['Choose automatically'], info:'The list is populated from voices installed on this computer. The saved value is the stable voice identity, not its display name.' }),
      ctl('nar_yue_voice','Cantonese voice','select','Choose automatically',{ options:['Choose automatically'], info:'The list is populated from voices installed on this computer. A missing choice is retained and clearly reported rather than silently replaced.' }),
      ctl('nar_rate','Narration rate','slider',1,{ min:0.5, max:2, step:0.1, info:'The platform rate, from 0.5 to 2.0. The voice normal is the default.' }),
      ctl('nar_pitch','Narration pitch','slider',1,{ min:0, max:2, step:0.1, info:'The platform pitch, from 0 to 2. The voice normal is the default.' }),
      ctl('nar_status','Narration status','text','No voice list loaded yet.',{ action:'narration-status', info:'Reports the effective voice, missing voice fallback, network-backed status and offline behavior.' })
    ]},{ title:'Motion', desc:'Global timing. Individual elements can still set their own.', ctls:[
      ctl('mo_speed','Animation speed','slider',100,{ min:0, max:300, unit:'%' }),
      ctl('mo_curve','Default easing','segmented','Emphasised',{ options:['Linear','Standard','Emphasised','Springy'] }),
      ctl('mo_screen','Screen transition','select','Lift and fade',{ options:['Lift and fade','Cross fade','Slide','Zoom','None'] }),
      ctl('mo_dialog','Dialog entrance','select','Per dialog',{ options:['Per dialog','Uniform rise','Uniform zoom'] }),
      ctl('mo_reduce','Respect reduced motion','switch',true),
      ctl('mo_hover','Hover lift','switch',true)
    ]},{ title:'Layout', desc:'Structure of the whole window.', ctls:[
      ctl('ly_dock','Rail position','segmented','Left',{ options:['Left','Right','Top','Compact'] }),
      ctl('ly_density','Density','segmented','Comfortable',{ options:['Dense','Comfortable','Spacious'] }),
      ctl('ly_radius','Corner radius','slider',16,{ min:0, max:40, unit:'px' }),
      ctl('ly_gap','Card spacing','slider',12,{ min:2, max:40, unit:'px' }),
      ctl('ly_tabs','Tab strip','segmented','Above content',{ options:['Above content','Below rail','Hidden'] }),
      ctl('ly_sidebar','Section list width','slider',268,{ min:180, max:420, unit:'px' }),
      ctl('ly_mono','Monospace numerics everywhere','switch',true)
    ]},{ title:'Theme', desc:'Colour across the console. Every colour control in the app uses the same infinite picker.', ctls:[
      ctl('th_mode','Mode','segmented','Dark',{ options:['Dark','Light','Follow system','Per screen'] }),
      ctl('th_hue','Accent hue','slider',148,{ min:0, max:360, unit:'°' }),
      ctl('th_sat','Accent saturation','slider',60,{ min:0, max:100, unit:'%' }),
      ctl('th_contrast','Contrast','segmented','Standard',{ options:['Standard','Medium','High'] }),
      ctl('th_rainbow','Rainbow accent','switch',false),
      ctl('th_rbspeed','Rainbow speed','slider',8,{ min:0.5, max:40, step:0.5, unit:'s per loop' }),
      ctl('th_tint','Tint surfaces with the accent','slider',6,{ min:0, max:40, unit:'%' })
    ]},{ title:'Behaviour', desc:'What the console does without being asked.', ctls:[
      ctl('bh_start','Open on launch','select','Dashboard',{ options:['Dashboard','Endpoints','Last screen','Customise everything'] }),
      ctl('bh_confirm','Confirmation','segmented','Four gates',{ options:['Four gates','Credits allowed','Single confirm'] }),
      ctl('bh_commit','Commit every change to git','switch',true),
      ctl('bh_lockdefault','Default lock method','select','PIN',{ options:['PIN','Password','Password + PIN','Password + PIN + TOTP'] }),
      ctl('bh_wizard','Offer the wizard first on every screen','switch',false),
      ctl('bh_explain','Show explain buttons','switch',true),
      ctl('bh_tour','Offer the tour on launch','switch',false)
    ]},{ title:'Profiles', desc:'Save the entire look and behaviour, then move it between machines.', ctls:[
      ctl('pr_active','Active profile','select','Default',{ options:['Default','Night operations','Training room','Demo'] }),
      ctl('pr_sync','Sync profile with agent memory','switch',true),
      ctl('pr_perscreen','Allow per-screen overrides','switch',true),
      ctl('pr_export','Include appearance overrides in exports','switch',true)
    ]}] },
  appearance:{ rail:'app', icon:'palette', label:'Appearance', badge:'', title:'Appearance', file:'console settings', kind:'generic',
    sub:'Density, theme and motion for this console. Changes apply immediately with an undo.',
    groups:[{ title:'Layout', desc:'How much fits on screen.', ctls:[
      ctl('p_density','Row density','segmented','Comfortable',{ options:['Dense','Comfortable','Spacious'] }),
      ctl('p_theme','Theme','segmented','Dark',{ options:['Dark','Light','Follow system'] }),
      ctl('p_scale','Interface scale','slider',100,{ min:80, max:150, step:5, unit:'%' }),
      ctl('p_motion','Reduced motion','switch',false),
      ctl('p_mono','Monospace numerics','switch',true)
    ]},{ title:'Behaviour', desc:'The console itself.', ctls:[
      ctl('p_start','Open on launch','select','Dashboard',{ options:['Dashboard','Endpoints','Last screen'] }),
      ctl('p_tour','Offer the tour on launch','switch',false),
      ctl('p_tray','Keep running in tray','switch',true),
      ctl('p_confirm','Full ceremony on every destructive action','switch',true,{ info:'Leave this on. It is the four-gate check: key, arming switch, slider and attention test.' })
    ]},{ title:'Personal vocabulary', desc:'A local JSON file that remaps specific words shown in this console to your own preferred terms. Loaded once from a file you choose; nothing in it is ever transmitted anywhere.', ctls:[
      ctl('va_file','Vocabulary file','file','',{ accept:'application/json,.json', info:'Choose a local JSON file with a top-level "version" of 1 and a "replacements" list of from/to pairs. It is read once, right here, entirely on this machine.' }),
      ctl('va_status','Status','text','No file loaded; original wording is active.',{ action:'vocab-status', info:'What the console currently has loaded, in plain words: how many replacements are active, or that nothing is loaded and the shipped wording is showing.' }),
      ctl('va_clear','Reset','segmented','Clear loaded file',{ options:['Clear loaded file'], action:'vocab-clear', info:'Removes the cached file and restores the shipped wording immediately. It never touches the file on disk, only what this console has cached.' })
    ]}] },
  about:{ rail:'app', icon:'info', label:'About & policy', badge:'', title:'About', file:'', kind:'generic',
    sub:'Build provenance and the policies this console is bound by.',
    groups:[{ title:'Policy', desc:'Non-negotiable behaviour, surfaced so it is never a surprise.', ctls:[
      ctl('z_sign','Code signing','segmented','Prohibited',{ options:['Prohibited'], info:'Packages ship unsigned on purpose. Windows may show an unknown-publisher warning; nothing here claims to be verified.' }),
      ctl('z_installer','Installer','segmented','Squirrel.Windows',{ options:['Squirrel.Windows'] }),
      ctl('z_telemetry','Telemetry','switch',false),
      ctl('z_crash','Send crash reports','switch',false)
    ]}] },
  docs:{ rail:'app', icon:'menu_book', label:'Documentation', badge:'', title:'Documentation', file:'docs/', kind:'docs',
    sub:'Every bundled feature article, searchable offline. Links between articles resolve inside this browser.', groups:[] },
  changelog:{ rail:'app', icon:'history_edu', label:'Changelog', badge:'', title:'Changelog', file:'', kind:'changelog',
    sub:'Every released version of this console, built from the tag history of this repository. Every change links to the real commit that made it.', groups:[] }
};


const DOCS = {
  e_transport:{ what:'Chooses which configured transport this endpoint signals over: plain UDP, TCP, TLS, or WebSocket for browsers.', why:'Signalling carries who is calling whom, the credentials exchange and the media keys. On UDP all of that is readable by anything on the path.', values:'transport-udp is the historic default and fine inside a trusted LAN. transport-tcp helps where packets are large or fragmented. transport-tls is the right answer for anything crossing a network you do not own. transport-wss is required for WebRTC browser clients.', gotcha:'The transport must already exist as a section in pjsip.conf. Selecting TLS without a certificate configured means the endpoint simply never registers, with a message that does not obviously say so.' },
  e_context:{ what:'The dialplan context this endpoint enters when it dials.', why:'A context is a namespace of extensions. It is the single most important security boundary in Asterisk: an endpoint can only reach what its context lets it reach.', values:'from-internal for staff phones, from-external for anything untrusted, from-trunk for carriers.', gotcha:'Putting a desk phone in from-external is the classic toll-fraud opening. If a compromised phone lands in a context that can dial out, it will.' },
  e_direct:{ what:'Whether the two phones may send audio straight to each other, leaving Asterisk out of the media path.', why:'It halves bandwidth at the PBX and removes a hop of latency.', values:'no keeps audio flowing through Asterisk. yes lets the endpoints talk directly once the call is up.', gotcha:'With direct media you cannot record, cannot monitor, and mid-call transfers get fragile. Almost every deployment that needs features leaves it off.' },
  e_symmetric:{ what:'Requires that RTP arrives from the same address and port we are sending to.', why:'It defeats a class of audio injection where a third party sprays packets at your open RTP port.', values:'yes is strongly recommended. no only for equipment that genuinely cannot comply.', gotcha:'Combined with rewrite_contact it also fixes most NAT audio problems, which is why the pair is usually enabled together.' },
  e_forcerport:{ what:'Sends responses back to the port the request actually came from, rather than the port the phone claimed.', why:'A phone behind NAT advertises its private port. Replying there sends the packet nowhere.', values:'yes for anything behind a router, which is nearly everything.', gotcha:'Turning it off for a remote phone produces one-way registration that silently expires.' },
  e_rewrite:{ what:'Replaces the Contact header address with the address the packet actually arrived from.', why:'Same NAT problem as force_rport, at the registration layer.', values:'yes for remote and home workers. Not needed on a flat trusted LAN.', gotcha:'On a carrier trunk this can be wrong: the carrier may legitimately present a Contact that differs from the source.' },
  e_encryption:{ what:'Whether media is encrypted, and with which scheme.', why:'TLS protects signalling only. Without media encryption the conversation itself is in the clear.', values:'no is unencrypted. sdes exchanges keys in the SDP and requires TLS to be meaningful. dtls negotiates keys in the media stream itself and is what WebRTC uses.', gotcha:'sdes over UDP signalling is theatre — the keys travel in plain text. If you turn on sdes, turn on TLS as well.' },
  e_dtmf:{ what:'How keypad presses travel from the phone to Asterisk.', why:'IVR menus, voicemail passwords and conference controls all depend on getting this right.', values:'rfc4733 sends them as RTP events and is the modern default. inband sends actual tones in the audio, which compressed codecs mangle. info uses SIP INFO messages. auto tries to work it out.', gotcha:'inband with g729 is the single most common cause of an IVR that ignores every key press.' },
  e_maxcontacts:{ what:'How many devices may register against this one identity at the same time.', why:'One identity ringing a desk phone and a mobile app together needs at least two.', values:'1 for a single desk phone. 2 to 3 for desk plus mobile. 0 means unlimited and should not be used.', gotcha:'A stolen credential can quietly add a device. Keep this as low as the deployment allows and watch the contact list.' },
  e_qualify:{ what:'How often Asterisk sends a lightweight OPTIONS request to check the endpoint is still alive.', why:'It is how the console knows an endpoint went unreachable before a caller discovers it.', values:'60 seconds is a sensible default. 30 for critical endpoints. 0 disables the check.', gotcha:'Very short intervals across hundreds of endpoints generate real traffic and real CPU. It is a poll, not a subscription.' },
  q_strategy:{ what:'How a waiting call is offered to the members of the queue.', why:'It decides whether callers wait less or agents share work evenly. You cannot optimise both.', values:'ringall rings every free agent and answers fastest. leastrecent picks whoever has gone longest without a call. fewestcalls balances totals. rrmemory is round robin that remembers its place. linear follows the member order exactly.', gotcha:'ringall on a large queue rings a lot of phones for every call, which staff find exhausting. Above about eight agents, move to rrmemory or leastrecent.' },
  q_wrapup:{ what:'How long after a call ends before this agent may be offered another.', why:'Agents need to finish notes. Without it the next call lands mid-sentence.', values:'15 to 30 seconds suits most support desks. 0 for a high-volume queue where notes are not taken.', gotcha:'It applies per member, not per queue, so an agent in three queues is unavailable in all of them during wrap-up.' },
  q_ringinuse:{ what:'Whether members already on a call should still be rung.', why:'Some phones can hold a second call; most staff cannot.', values:'no in almost every case.', gotcha:'Turning it on makes queue statistics misleading, because calls appear offered to people who could never have taken them.' },
  q_joinempty:{ what:'Under which member states a caller is still allowed to enter the queue.', why:'It stops callers waiting in a line nobody is standing behind.', values:'A list of states: paused, inuse, invalid, unavailable, ringing.', gotcha:'The semantics are inverted from what most people expect: these are the states that still count as "somebody is there".' },
  q_service:{ what:'The answer target used to calculate the service level percentage.', why:'It is the number a manager reports on.', values:'60 seconds is the industry convention.', gotcha:'Changing it rewrites the meaning of every historical report; the stored data is raw wait times, but the percentage is computed against whatever this says today.' },
  v_delete:{ what:'Whether the recording is deleted from the PBX once it has been emailed.', why:'Mailbox storage on a PBX is finite and messages accumulate forever.', values:'Off keeps a copy on the PBX. On makes email the only copy.', gotcha:'If the mail server bounces the message, on means the recording is gone. Verify delivery before enabling it.' },
  v_maxsecs:{ what:'The longest a single voicemail message may be.', why:'It bounds storage and stops accidental open-line recordings filling the disk.', values:'180 seconds is generous for business use.', gotcha:'Callers are cut off mid-word with no warning tone unless you also configure one.' },
  s_guest:{ what:'Whether calls from unauthenticated sources are accepted.', why:'It is the setting that decides whether strangers can use your phone system.', values:'Off. Always off, unless you are running a public conference bridge and know exactly why.', gotcha:'Combined with a permissive context this is how a PBX ends up dialling premium numbers overnight.' },
  s_stir:{ what:'Whether outbound calls are signed with a STIR/SHAKEN identity token.', why:'Carriers increasingly downgrade or label unsigned calls, and regulators increasingly require it.', values:'On for anything reaching the public network.', gotcha:'Signing requires a certificate from an authorised provider. Enabling it without one produces calls that fail to sign and log an error per call.' },
  s_level:{ what:'The attestation level asserted on signed calls.', why:'It tells the far end how confident you are that the caller may use that number.', values:'A means you know the caller and their right to the number. B means you know the caller but not the number. C means the call merely passed through you.', gotcha:'Claiming A when you cannot prove it is worse than honestly claiming C — it is the specific thing enforcement looks for.' },
  k_order:{ what:'The order codecs are offered in an SDP.', why:'The far end picks the first one it also speaks, so order is preference.', values:'opus for quality, g722 for wideband on desk phones, ulaw as the universal fallback, g729 only where bandwidth is scarce and you have licences.', gotcha:'Putting a narrowband codec first means every call is narrowband, no matter what the phones support.' },
  r_start:{ what:'The lowest UDP port Asterisk will use for media.', why:'Firewalls need to know the range to open.', values:'10000 to 20000 is the usual convention.', gotcha:'Two calls need two ports each. A range smaller than four times your busy-hour concurrency will drop calls with no obvious error.' },
  d_backend:{ what:'Where call detail records are written.', why:'Billing, reporting and disputes all depend on these records existing.', values:'csv for small sites, odbc or pgsql for anything that needs querying, custom when you have your own schema.', gotcha:'If the database becomes unreachable, Asterisk may block on writes. Batch mode mitigates it; test the failure case before you rely on it.' },
  a_read:{ what:'Which classes of AMI events and commands this user may read.', why:'AMI is full administrative access. Class-based permissions are the only granularity available.', values:'system, call, log, verbose, command, agent, user, config, dtmf, reporting, cdr, dialplan, originate, message.', gotcha:'The command class allows arbitrary CLI execution. Granting it is equivalent to granting a shell.' },
  mo_auto:{ what:'Whether Asterisk loads every module it finds at startup.', why:'Convenient, but it means an unused module with a vulnerability is loaded anyway.', values:'On for a lab. Off with an explicit load list for a hardened deployment.', gotcha:'Turning it off without listing what you actually need produces a PBX that starts cleanly and does nothing.' },
  g_rotate:{ what:'How log files are rotated when they reach the size limit.', why:'Unrotated logs fill the disk, and a full disk stops Asterisk.', values:'rotate renames sequentially, timestamp appends the date, sequential numbers forever, none disables it.', gotcha:'If an external logrotate is also configured, both will fight and you will lose log lines at the boundary.' },
  sv_kind:{ what:'How this console reaches Asterisk: locally, into a container, over SSH, or over SSH and then into a container.', why:'Everything else on the screen reshapes around this answer, including how configuration files are written.', values:'Local for the same machine, Local Docker for a container here, SSH for another machine, SSH Docker for a container elsewhere.', gotcha:'Over SSH the manager port is forwarded through the tunnel, so it never crosses the network unprotected — but only if tunnel forwarding stays enabled.' },
  sv_hostkey:{ what:'Whether a changed SSH host key aborts the connection.', why:'A changed host key means either a rebuild or an interception. Only one of those is benign.', values:'On, always.', gotcha:'The prompt asking a human to accept a new key is precisely how these attacks succeed. This console refuses instead of asking.' },
  hi_commit:{ what:'Whether every individual control change writes a git commit immediately.', why:'It gives you an exact, attributable history and a one-click revert of any single change.', values:'On is strongly recommended.', gotcha:'Off batches changes until you commit manually, which in practice means nobody remembers what changed between two working states.' },
  fun_random:{ what:'Gives every rendered element its own randomly generated appearance.', why:'Because you asked, and because it makes a dull configuration screen memorable.', values:'A seed, a scope of properties to randomise, a wildness percentage and an optional reroll on every screen change.', gotcha:'At high wildness with rotation enabled, dense tables become genuinely hard to read. That is the intent, but it is worth knowing.' },
  chaos_level:{ what:'How playful the console is allowed to be, from 0 to 4.', why:'One dial that scales celebrations, copy tone, motion and randomness together.', values:'0 Bank, 1 Polite, 2 Balanced, 3 Playful, 4 Unhinged.', gotcha:'Level 4 celebrates trivial changes. It is delightful for a week and then you will want level 2.' }
};

const ADVANCED = ['e_symmetric','e_forcerport','e_ice','e_trust','r_dtmf','r_strict','r_ice','r_start','r_end','k_ptime','k_opusbr','a_deny','a_timeout','mo_preload','mo_noload','mo_require','g_queue','s_ciphers','s_verify','t_100rel','t_privacy','t_from','c_mixing','c_rate','l_date','d_batch','d_size','y_retain','hi_gc','hi_sign','hi_push','sv_forward','sv_sshport','cp_ease','cp_dir','fun_random_seed','fun_random_scope','fun_random_strength','fun_random_reroll','mo_curve','mo_dialog','ly_radius','ly_gap','ly_sidebar','th_tint','pr_perscreen','pr_export'];

const ORDER = ['servers','dash','live','endpoints','trunks','trunkauth','fcodes','iaxpeers','canvas','ivr','queues','voicemail','confbridge','moh','sounds','codecs','fax','cdr','ami','modules','logger','httpd','security','cli','memory','sync','skills','hub','vocab','ops','secrets','arcade','notifications','history','customise','appearance','about','docs','changelog'];

const GAMES = [
  { id:'whack', kind:'whack', icon:'sports_martial_arts', name:'Whack the bug', reward:2, blurb:'Targets pop across fifteen holes. Hit them, miss the empties. Twenty seconds.' },
  { id:'dtmf', kind:'dtmf', icon:'dialpad', name:'Tone memory', reward:3, blurb:'A sequence flashes on the display. Tap it back on the keypad. One digit longer each round.' },
  { id:'sort', kind:'sort', icon:'swap_vert', name:'Codec sort', reward:2, blurb:'Put five codecs in bandwidth order, lowest first, then check your answer.' },
  { id:'match', kind:'match', icon:'extension', name:'Match the option', reward:3, blurb:'Tap an option, then tap what it does. Six pairs, no penalty for thinking.' },
  { id:'spot', kind:'spot', icon:'travel_explore', name:'Spot the misconfiguration', reward:4, blurb:'One line in this config block is wrong. Find it. Genuinely useful practice.' },
  { id:'dial', kind:'reflex', icon:'timer', name:'Speed dial', reward:1, blurb:'An extension appears. Tap its last digit before it changes. Pure reflex.' },
  { id:'ring', kind:'reflex', icon:'notifications_active', name:'Ring rhythm', reward:1, blurb:'Same reflex, faster cadence. Australia is harder than it sounds.' },
  { id:'trunk', kind:'whack', icon:'cable', name:'Patch the trunk', reward:2, blurb:'Lines light up across the switchboard. Patch each one before it drops. Genuinely 1962.' }
];

const AUTH_REQS = [
  { id:'a1', partner:'carrier-primary', icon:'lan', risk:'High risk', when:'14 minutes ago',
    title:'carrier-primary wants to add a new source address',
    body:'They are asking permission to send calls to you from 203.0.113.19 in addition to their existing address. Saying yes widens who may deliver calls onto your PBX; saying no changes nothing and their existing address keeps working.',
    facts:[{ k:'New address', v:'203.0.113.19' }, { k:'Existing', v:'198.51.100.7' }, { k:'Affects', v:'inbound only' }] },
  { id:'a2', partner:'branch-iax', icon:'graphic_eq', risk:'Low risk', when:'2 hours ago',
    title:'branch-iax wants to add opus to the shared link',
    body:'A codec addition. Better audio, slightly more CPU on both sides, no change to who can reach you. Reversible at any time from either end.',
    facts:[{ k:'Codec', v:'opus' }, { k:'Current', v:'g722, ulaw' }, { k:'Reversible', v:'yes' }] },
  { id:'a3', partner:'carrier-backup', icon:'speed', risk:'Medium risk', when:'yesterday',
    title:'carrier-backup wants to raise the concurrent call cap to 120',
    body:'Doubling the ceiling means a busy day is handled, and also that a fault or a compromised account can cost twice as much before anything trips. Consider a spend alert alongside a yes.',
    facts:[{ k:'Requested cap', v:'120 calls' }, { k:'Current cap', v:'60 calls' }, { k:'Billing impact', v:'possible' }] }
];

const CODEC_ORDER = ['g729 · 8 kbps', 'gsm · 13 kbps', 'ulaw · 64 kbps', 'g722 · 64 kbps', 'opus · 128 kbps'];

const MATCH_PAIRS = [
  ['direct_media', 'audio skips Asterisk'],
  ['rewrite_contact', 'fixes phones behind NAT'],
  ['wrapuptime', 'agent rest between calls'],
  ['qualify_frequency', 'how often we ping the phone'],
  ['joinempty', 'may a caller enter an empty queue'],
  ['max_contacts', 'devices sharing one identity']
];

const SPOT_LINES = [
  { t:'[1005]', bad:false }, { t:'type = endpoint', bad:false },
  { t:'transport = transport-tls', bad:false }, { t:'context = from-external', bad:true },
  { t:'allow = opus,g722,ulaw', bad:false }, { t:'media_encryption = sdes', bad:false }
];

const REGEX_GROUPS = [
  { title:'Anchors', items:[['^','starts with'],['$','ends with'],['\\b','word edge']] },
  { title:'Characters', items:[['\\d','any digit'],['\\w','letter or digit'],['\\s','a space'],['.','any character'],['[a-z]','a letter'],['[0-9]','a number']] },
  { title:'Repeats', items:[['+','one or more'],['*','none or more'],['?','optional'],['{2,4}','between 2 and 4']] },
  { title:'Groups', items:[['(…)','capture'],['(a|b)','either'],['(?:…)','group only'],['(?!…)','not followed by']] },
  { title:'Telephony', items:[['^PJSIP/','PJSIP channels'],['^1\\d{3}$','4-digit extension'],['\\.conf$','a config file'],['(?i)fail','failure, any case']] }
];

const APPEAR_STATES = ['Default','Hover','Active','Focus','Disabled'];

const APPEAR_GROUPS = [
  { icon:'help', title:'What this panel changes', ctls:[
    ctl('ap_scope_status','Applies right now','text','',{ action:'appearance-scope', info:'Names exactly which of these controls reach the console and which only move the preview swatch. A panel that shows fifty controls and quietly honours six is telling you it did something it did not do.' })
  ] },
  { icon:'text_fields', title:'Typography', ctls:[
    ctl('ap_family','Font family','select','Roboto',{ options:['Roboto','Roboto Mono','Roboto Serif','Roboto Condensed'] }),
    ctl('ap_weight','Weight','segmented','500',{ options:['300','400','500','700'] }),
    ctl('ap_size','Size','slider',14,{ min:8, max:48, unit:'px' }),
    ctl('ap_track','Letter spacing','slider',0,{ min:-4, max:12, step:0.5, unit:'px' }),
    ctl('ap_lead','Line height','slider',1.5,{ min:0.8, max:3, step:0.1 }),
    ctl('ap_case','Case','segmented','As typed',{ options:['As typed','UPPER','lower','Title'] }),
    ctl('ap_num','Numerals','segmented','Proportional',{ options:['Proportional','Tabular','Old style'] }),
    ctl('ap_deco','Decoration','chips',[],{ options:['underline','line-through','overline','italic'] })
  ]},
  { icon:'palette', title:'Fill', ctls:[
    ctl('ap_hue','Hue','slider',148,{ min:0, max:360, unit:'°' }),
    ctl('ap_sat','Saturation','slider',54,{ min:0, max:100, unit:'%' }),
    ctl('ap_light','Lightness','slider',68,{ min:0, max:100, unit:'%' }),
    ctl('ap_alpha','Opacity','slider',100,{ min:0, max:100, unit:'%' }),
    ctl('ap_fill','Fill type','segmented','Solid',{ options:['None','Solid','Linear','Radial','Conic'] }),
    ctl('ap_blend','Blend mode','select','normal',{ options:['normal','multiply','screen','overlay','difference','hue','luminosity'] })
  ]},
  { icon:'gradient', title:'Rainbow & animated colour', ctls:[
    ctl('ap_rainbow','Rainbow fill','switch',false,{ info:'Cycles the fill through the whole hue wheel forever. Use it on one element, for fun. Use it on forty and the console becomes unusable, which is your right.' }),
    ctl('ap_rbspeed','Cycle speed','slider',6,{ min:0.5, max:30, step:0.5, unit:'s per loop' }),
    ctl('ap_rbrange','Hue range','slider',360,{ min:30, max:360, unit:'°' }),
    ctl('ap_rbease','Cycle easing','segmented','linear',{ options:['linear','ease-in-out','steps'] }),
    ctl('ap_rbdir','Direction','segmented','Forward',{ options:['Forward','Reverse','Ping-pong'] }),
    ctl('ap_rbsat','Rainbow saturation','slider',62,{ min:0, max:100, unit:'%' }),
    ctl('ap_rblight','Rainbow lightness','slider',66,{ min:0, max:100, unit:'%' }),
    ctl('ap_transition','Property transition','slider',180,{ min:0, max:2000, step:20, unit:'ms' })
  ]},
  { icon:'border_style', title:'Border & shape', ctls:[
    ctl('ap_bw','Border width','slider',1,{ min:0, max:12, unit:'px' }),
    ctl('ap_bs','Border style','segmented','solid',{ options:['solid','dashed','dotted','double'] }),
    ctl('ap_r1','Radius top-left','slider',12,{ min:0, max:60, unit:'px' }),
    ctl('ap_r2','Radius top-right','slider',12,{ min:0, max:60, unit:'px' }),
    ctl('ap_r3','Radius bottom-right','slider',12,{ min:0, max:60, unit:'px' }),
    ctl('ap_r4','Radius bottom-left','slider',12,{ min:0, max:60, unit:'px' })
  ]},
  { icon:'layers', title:'Shadow', ctls:[
    ctl('ap_sx','Offset X','slider',0,{ min:-40, max:40, unit:'px' }),
    ctl('ap_sy','Offset Y','slider',4,{ min:-40, max:40, unit:'px' }),
    ctl('ap_sb','Blur','slider',14,{ min:0, max:80, unit:'px' }),
    ctl('ap_ss','Spread','slider',0,{ min:-20, max:40, unit:'px' }),
    ctl('ap_sin','Inset','switch',false),
    ctl('ap_sop','Shadow opacity','slider',45,{ min:0, max:100, unit:'%' })
  ]},
  { icon:'padding', title:'Spacing & layout', ctls:[
    ctl('ap_pt','Padding top','slider',12,{ min:0, max:64, unit:'px' }),
    ctl('ap_pr','Padding right','slider',16,{ min:0, max:64, unit:'px' }),
    ctl('ap_pb','Padding bottom','slider',12,{ min:0, max:64, unit:'px' }),
    ctl('ap_pl','Padding left','slider',16,{ min:0, max:64, unit:'px' }),
    ctl('ap_gap','Gap','slider',8,{ min:0, max:48, unit:'px' }),
    ctl('ap_align','Align','segmented','center',{ options:['start','center','end','stretch'] })
  ]},
  { icon:'blur_on', title:'Effects', ctls:[
    ctl('ap_blur','Blur','slider',0,{ min:0, max:20, unit:'px' }),
    ctl('ap_bright','Brightness','slider',100,{ min:0, max:200, unit:'%' }),
    ctl('ap_contrast','Contrast','slider',100,{ min:0, max:200, unit:'%' }),
    ctl('ap_satf','Saturate','slider',100,{ min:0, max:300, unit:'%' }),
    ctl('ap_hrot','Hue rotate','slider',0,{ min:0, max:360, unit:'°' }),
    ctl('ap_grey','Grayscale','slider',0,{ min:0, max:100, unit:'%' })
  ]},
  { icon:'transform', title:'Transform', ctls:[
    ctl('ap_tx','Translate X','slider',0,{ min:-60, max:60, unit:'px' }),
    ctl('ap_ty','Translate Y','slider',0,{ min:-60, max:60, unit:'px' }),
    ctl('ap_scale','Scale','slider',100,{ min:20, max:200, unit:'%' }),
    ctl('ap_rot','Rotate','slider',0,{ min:-180, max:180, unit:'°' }),
    ctl('ap_skew','Skew','slider',0,{ min:-40, max:40, unit:'°' })
  ]},
  { icon:'animation', title:'Motion', ctls:[
    ctl('ap_anim','Entrance','select','rise',{ options:['none','rise','pop','wiggle','glow','sweep'] }),
    ctl('ap_dur','Duration','slider',180,{ min:0, max:1200, step:20, unit:'ms' }),
    ctl('ap_ease','Easing','segmented','ease-out',{ options:['linear','ease','ease-in','ease-out','spring'] }),
    ctl('ap_celebrate','Celebrate on change','switch',true)
  ]}
];

const ONE_CLICK_LOG = [
  { text:'Waking the server up. It was asleep. Very rude of us.', ms:'0.4s' },
  { text:'Teaching the server what a telephone is. It is taking this well.', ms:'1.1s' },
  { text:'Installing Asterisk. Removing the seventy options nobody has ever used.', ms:'2.6s' },
  { text:'Inventing four extensions. They are 1001 to 1004, because imagination is expensive.', ms:'3.4s' },
  { text:'Building a queue called support. Nobody is in it yet. Enjoy the silence.', ms:'4.0s' },
  { text:'Generating certificates. Politely refusing to sign anything, as is tradition.', ms:'4.9s' },
  { text:'Recording a hold music opinion. It is fine. It is always just fine.', ms:'5.5s' },
  { text:'Hardening the thing so a stranger cannot dial Antarctica on your money.', ms:'6.3s' },
  { text:'Telling the memory ledger what we did, so future you cannot deny it.', ms:'6.9s' },
  { text:'Done. Your phone system is enterprise grade and slightly smug.', ms:'7.2s' }
];

const NODES = [
  { id:'n1', x:24, y:28, icon:'call_received', title:'Inbound · DID 5550100', detail:'context from-external\nexten _X. => 1' },
  { id:'n2', x:252, y:28, icon:'schedule', title:'Business hours', detail:'GotoIfTime 09:00-17:00\nmon-fri' },
  { id:'n3', x:252, y:164, icon:'dialpad', title:'IVR · main', detail:'Background(welcome)\nWaitExten(7)' },
  { id:'n4', x:478, y:112, icon:'groups', title:'Queue · support', detail:'Queue(support,tT,,,180)' },
  { id:'n5', x:478, y:248, icon:'voicemail', title:'Voicemail · 1004', detail:'VoiceMail(1004@default,u)' },
  { id:'n6', x:24, y:300, icon:'nightlight', title:'After hours', detail:'Playback(closed-message)\nHangup()' }
];

const EDGES = [['n1','n2'],['n2','n3'],['n3','n4'],['n3','n5'],['n2','n6']];
const NW = 196, NH = 68;

/* One list, two readers: the dashboard's Quick actions panel and the PBX menu. Both used
 * to hand-copy the same six commands, which is exactly how a seventh command gets added
 * to one and forgotten in the other. */
const QUICK_ACTIONS = [
  { icon:'refresh', label:'Reload dialplan', cmd:'dialplan reload' },
  { icon:'refresh', label:'Reload PJSIP', cmd:'pjsip reload' },
  { icon:'restart_alt', label:'Graceful restart', cmd:'core restart gracefully' },
  { icon:'phone_forwarded', label:'Originate test call', cmd:'channel originate PJSIP/1001 extension 1000@from-internal' },
  { icon:'cleaning_services', label:'Clear queue stats', cmd:'queue reset stats' },
  { icon:'bug_report', label:'Capture debug bundle', cmd:'core show settings' }
];

const NODE_CTLS = {
  n1:[ctl('dp_ctx','Context','select','from-external',{ options:['from-external','from-internal','from-trunk'] }), ctl('dp_pat','Match pattern','segmented','Any number',{ options:['Exact','Prefix','Any number'] }), ctl('dp_cid','Screen caller ID','switch',true)],
  n2:[ctl('dp_days','Days','chips',['mon','tue','wed','thu','fri'],{ options:['mon','tue','wed','thu','fri','sat','sun'] }), ctl('dp_from','Opens','slider',9,{ min:0, max:23, unit:':00' }), ctl('dp_to','Closes','slider',17,{ min:0, max:23, unit:':00' }), ctl('dp_hol','Respect holiday list','switch',true)],
  n3:[ctl('dp_prompt','Prompt','select','welcome-greeting',{ options:['welcome-greeting','support-options','closed-message'] }), ctl('dp_wait','Wait for digits','slider',7,{ min:1, max:30, unit:'s' }), ctl('dp_barge','Allow barge-in','switch',true)],
  n4:[ctl('dp_q','Queue','select','support',{ options:['support','sales','billing'] }), ctl('dp_qt','Maximum wait','slider',180,{ min:30, max:900, step:30, unit:'s' }), ctl('dp_moh','Hold class','select','default',{ options:['default','jazz','ringing'] }), ctl('dp_opts','Queue options','chips',['t','T'],{ options:['t','T','r','c','n','i'] })],
  n5:[ctl('dp_box','Mailbox','select','1004',{ options:['1001','1002','1004','1010'] }), ctl('dp_greet','Greeting','segmented','unavailable',{ options:['unavailable','busy','none'] }), ctl('dp_skip','Skip instructions','switch',false)],
  n6:[ctl('dp_msg','Message','select','closed-message',{ options:['closed-message','holiday-message'] }), ctl('dp_after','Then','segmented','Hangup',{ options:['Hangup','Voicemail','Forward'] })]
};

const step = (label, t, b, why, ctls, warn) => ({ label, t, b, why, ctls:ctls || [], warn:warn || '' });

const WIZARDS = {
  endpoints:[
    step('Purpose','What are you adding?','Every later question changes based on this answer, so you are never shown a setting that does not apply to the thing you picked.',
      'A desk phone and a carrier trunk use the same underlying object type in Asterisk, but almost none of the same options. Choosing here means the console can hide the other ninety.',
      [ctl('w_kind','Object type','segmented','Desk phone',{ options:['Desk phone','Softphone','Trunk','Application'] }),
       ctl('w_where','Where does it live?','segmented','On the LAN',{ options:['On the LAN','Over the internet','In a branch'], info:'On the LAN means the same building and network as the PBX. Over the internet means it is somewhere else and there is probably a home router in the way.' }),
       ctl('w_users','How many people share it?','stepper',1,{ min:1, max:10 })]),
    step('Identity','Give it a name','The name is the only thing typed in this whole wizard, because a name cannot be guessed for you. Extension numbers are conventional but any label works.',
      'Asterisk uses this string as the section header in pjsip.conf and as the username the phone registers with. Change it later and the phone stops registering until it is reconfigured too.',
      [ctl('w_name','Name','text','1005'),
       ctl('w_display','Caller ID name source','segmented','Directory',{ options:['Directory','Custom','Inherit trunk'] }),
       ctl('w_ext','Reachable on extension','switch',true),
       ctl('w_dir','List in the dial-by-name directory','switch',true)]),
    step('Transport','How does it connect?','Pick the road the signalling travels on. TLS is the same road inside an armoured tunnel and is the right answer for anything leaving the building.',
      'UDP is the historic default and still fine inside a trusted LAN. TLS costs a certificate and a little CPU and makes call setup unreadable to anyone watching the network.',
      [ctl('w_transport','Transport','select','transport-tls',{ options:['transport-udp','transport-tcp','transport-tls','transport-wss'] }),
       ctl('w_context','Dialplan context','select','from-internal',{ options:['from-internal','from-external','from-trunk'], info:'When this endpoint dials, Asterisk looks for the number inside this context. Think of it as which phone book gets opened.' }),
       ctl('w_nat','Behind a home router or NAT','switch',false),
       ctl('w_qualify','Health-check every','slider',60,{ min:0, max:300, step:10, unit:'s' })],
      'Choosing UDP for something reachable from the internet exposes call setup in clear text.'),
    step('Security','Who is allowed to be it?','Authentication and how many devices may claim this identity at once.',
      'max_contacts above one lets the same extension ring on a desk phone and a mobile app together. It also means a stolen credential can quietly add a second device, so keep the number as low as it needs to be.',
      [ctl('w_auth','Authentication','segmented','Password',{ options:['Password','Certificate','IP address'] }),
       ctl('w_secret','Credential','select','generate new',{ options:['generate new','carrier-primary-auth','reuse existing'], info:'Generated credentials go straight into the secret intake. The value is never displayed, not even once.' }),
       ctl('w_maxcontacts','Devices allowed','stepper',1,{ min:1, max:10 }),
       ctl('w_acl','Restrict to network','select','trusted-nets',{ options:['trusted-nets','branch-offices','anywhere'] })]),
    step('Media','How should audio behave?','Sensible defaults are chosen already. If none of these words mean anything yet, press Next — this is what a working office phone uses.',
      'Codec order is a preference list, not a demand. Asterisk offers them in this order and the phone picks the first one it also speaks. Opus sounds best, ulaw is understood by absolutely everything.',
      [ctl('w_codecs','Codec preference','order',['opus','g722','ulaw'],{ pool:['alaw','g729','gsm'] }),
       ctl('w_encrypt','Encrypt the audio','switch',true),
       ctl('w_direct','Let phones send audio to each other directly','switch',false,{ info:'On takes Asterisk out of the audio path, which saves bandwidth but breaks recording and mid-call transfers.' }),
       ctl('w_dtmf','Keypad tones','segmented','rfc4733',{ options:['rfc4733','inband','info','auto'] })]),
    step('Routing','What happens on no answer?','Where an unanswered call goes, and how long it rings first.',
      'Without a fallback an unanswered call rings until the caller gives up, which is the single most common complaint about a new phone system.',
      [ctl('w_ringfor','Ring for','slider',20,{ min:5, max:120, unit:'s' }),
       ctl('w_noanswer','Then','segmented','Voicemail',{ options:['Voicemail','Queue','Another extension','Hang up'] }),
       ctl('w_vm','Create a mailbox','switch',true),
       ctl('w_busy','When busy','segmented','Voicemail',{ options:['Voicemail','Call waiting','Busy tone'] })]),
    step('Review','Check and apply','This is the exact configuration that will be written. Nothing is applied until you clear the four confirmation gates.',
      'The console writes to a staging copy first, reloads PJSIP, and rolls back automatically if the endpoint fails to appear in the running configuration within ten seconds.',
      [ctl('w_reload','After writing','segmented','Reload PJSIP',{ options:['Reload PJSIP','Write only','Reload and test call'] }),
       ctl('w_attest','Attest this change to memory','switch',true)])
  ],
  queues:[
    step('Purpose','What is this queue for?','Ring strategy and patience settings follow from this one answer.',
      'A sales queue wants the longest-idle agent so leads spread evenly. A support queue usually wants everyone to ring at once so the caller waits the shortest possible time.',
      [ctl('wq_kind','Queue type','segmented','Support',{ options:['Support','Sales','Billing','Overflow'] }),
       ctl('wq_hours','Only during business hours','switch',true)]),
    step('Members','Who answers it?','Agents are picked from the endpoint list, and their penalty decides who is tried first.',
      'Penalty is a tier number, not a punishment. Penalty 0 rings first; penalty 1 only rings if nobody at 0 picked up.',
      [ctl('wq_members','Members','order',['1001','1002','1004'],{ pool:['1003','reception','softphone-ada'] }),
       ctl('wq_penalty','Use penalty tiers','switch',false),
       ctl('wq_auto','Pause an agent after a missed call','segmented','no',{ options:['no','yes','all'] })]),
    step('Strategy','How are calls offered?','Choose how a waiting call is handed to your members.',
      'ringall is the safe default. leastrecent and fewestcalls only make sense once you have enough traffic for fairness to matter.',
      [ctl('wq_strategy','Strategy','select','ringall',{ options:['ringall','leastrecent','fewestcalls','random','rrmemory','linear'] }),
       ctl('wq_timeout','Ring each member for','slider',15,{ min:5, max:120, unit:'s' }),
       ctl('wq_wrapup','Rest between calls','slider',15,{ min:0, max:300, unit:'s' }),
       ctl('wq_ringinuse','Ring members already on a call','switch',false)]),
    step('Caller','What does the caller hear?','Hold music, position announcements and the point at which you stop making them wait.',
      'Telling a caller their position only helps if the queue is short. Above about ten waiting it reliably makes people hang up.',
      [ctl('wq_moh','Hold music','select','default',{ options:['default','jazz','ringing'] }),
       ctl('wq_position','Announce position','switch',true),
       ctl('wq_periodic','Repeat announcement every','slider',60,{ min:0, max:600, step:15, unit:'s' }),
       ctl('wq_maxwait','Give up after','slider',300,{ min:30, max:1800, step:30, unit:'s' }),
       ctl('wq_then','Then send to','segmented','Voicemail',{ options:['Voicemail','Another queue','Hang up'] })]),
    step('Review','Check and apply','The queue and its members are written together so no call can land in a half-built queue.',
      'Members are added with a live queue add, so existing calls are undisturbed.',
      [ctl('wq_attest','Attest this change to memory','switch',true)])
  ],
  servers:[
    step('Reach','How do we reach Asterisk?','Four routes are supported. Pick the one that matches where the PBX actually runs.',
      'Local means the same machine as this console. A container needs a name, not an address. SSH tunnels the manager port so it never crosses the network in the open.',
      [ctl('sv_kind','Connection type','segmented','Local',{ options:['Local','Local Docker','SSH','SSH Docker'], info:'Local Docker is a container running on this machine. SSH Docker is a container on another machine, reached over SSH first and then into the container.' }),
       ctl('sv_profile','Save as','select','New profile',{ options:['New profile','pbx-hq','pbx-branch','lab'] })]),
    step('Target','Where exactly?','Hosts, containers and sockets are discovered and offered as a list — nothing here is typed.',
      'The console enumerates running containers and your SSH config, so a typo in a hostname is not a failure mode that exists.',
      [ctl('sv_host','Host','select','pbx-hq.internal',{ options:['localhost','pbx-hq.internal','pbx-branch.internal','10.20.4.10'] }),
       ctl('sv_container','Container','select','asterisk-prod',{ options:['asterisk-prod','asterisk-lab','asterisk-edge'] }),
       ctl('sv_sshport','SSH port','stepper',22,{ min:1, max:65535 }),
       ctl('sv_user','SSH user','select','asterisk-ops',{ options:['asterisk-ops','root','deploy'] })]),
    step('Credentials','How do we authenticate?','Keys come from the agent, the machine keychain or the secret intake. No private key is ever displayed.',
      'Host key checking is on by default. If the host key changes, the console refuses to connect rather than asking you to accept it — that prompt is how people get compromised.',
      [ctl('sv_auth','SSH authentication','segmented','Agent key',{ options:['Agent key','Keychain key','Secret intake'] }),
       ctl('sv_key','Key','select','id_ed25519 (agent)',{ options:['id_ed25519 (agent)','ops-deploy (keychain)','pbx-hq (intake)'] }),
       ctl('sv_hostkey','Strict host key checking','switch',true),
       ctl('sv_sudo','Escalate with sudo','switch',false)]),
    step('Manager','Manager interface','AMI or ARI, its port, and whether it is wrapped in TLS. Over SSH the port is forwarded, so it never leaves the far machine.',
      'AMI gives you live channel events and CLI execution. ARI adds the REST and websocket surface that Stasis applications need. Most consoles want AMI.',
      [ctl('sv_iface','Interface','segmented','AMI',{ options:['AMI','ARI','Both'] }),
       ctl('sv_amiport','AMI port','stepper',5038,{ min:1, max:65535 }),
       ctl('sv_tls','TLS','switch',true),
       ctl('sv_forward','Forward through the SSH tunnel','switch',true),
       ctl('sv_amiuser','Manager user','select','monitor',{ options:['monitor','dialer','create new'] })]),
    step('Paths','Where does its configuration live?','The console reads the running configuration through the manager interface and writes files through the same route it connected with.',
      'A container almost always uses the default paths. A hand-built installation often does not, which is why this is offered rather than assumed.',
      [ctl('sv_paths','Layout','segmented','Standard',{ options:['Standard','Container default','Custom'] }),
       ctl('sv_conf','Configuration directory','select','/etc/asterisk',{ options:['/etc/asterisk','/usr/local/etc/asterisk','/config'] }),
       ctl('sv_sounds','Sounds directory','select','/var/lib/asterisk/sounds',{ options:['/var/lib/asterisk/sounds','/usr/share/asterisk/sounds'] }),
       ctl('sv_readonly','Open read-only','switch',false)]),
    step('Test','Test the connection','Every gate is checked before the profile is saved, and each result says what to do if it is red.',
      'A green manager login with a red CLI probe usually means the manager user is missing the command permission class.',
      [ctl('sv_probe','Probe depth','segmented','Full',{ options:['Reachability','Manager login','Full'] }),
       ctl('sv_watch','Reconnect automatically','switch',true),
       ctl('sv_default','Make this the default profile','switch',true)])
  ],
  ivr:[
    step('Greeting','What does the caller hear first?','Every menu opens with a prompt. Record one, pick one already on the system, or have the console read text aloud.',
      'A caller decides whether your company is competent in the first four seconds. A prompt recorded on a phone in a corridor is worse than a synthesised one.',
      [ctl('wi_prompt','Prompt source','segmented','Existing file',{ options:['Existing file','Record now','Text to speech'] }),
       ctl('wi_file','Prompt','select','welcome-greeting',{ options:['welcome-greeting','support-options','closed-message'] }),
       ctl('wi_lang','Language','select','en',{ options:['en','es','fr','de','zh'] }),
       ctl('wi_barge','Let callers press a key during the prompt','switch',true)]),
    step('Keys','Map the keypad','Assign each digit. Unassigned digits fall through to the invalid handler, so you never have to fill all ten.',
      'Nine options is far too many. Three or four is the number a caller can hold in their head while the prompt is still playing.',
      [ctl('wi_1','Press 1','select','Queue support',{ options:['Queue support','Queue sales','Extension','Submenu','Voicemail','Directory'] }),
       ctl('wi_2','Press 2','select','Queue sales',{ options:['Queue support','Queue sales','Extension','Submenu','Voicemail','Directory'] }),
       ctl('wi_3','Press 3','select','Directory',{ options:['Queue support','Queue sales','Extension','Submenu','Voicemail','Directory'] }),
       ctl('wi_0','Press 0','select','Extension',{ options:['Extension','Queue support','Voicemail'] }),
       ctl('wi_direct','Allow dialling an extension directly','switch',true)]),
    step('Patience','Timeouts and mistakes','What happens when a caller says nothing, or presses a key you never assigned.',
      'Repeating the whole menu three times is the most reliable way to make somebody hang up angry. Two repeats then a human is the humane pattern.',
      [ctl('wi_timeout','Wait for a key','slider',7,{ min:1, max:30, unit:'s' }),
       ctl('wi_retries','Repeat at most','stepper',2,{ min:1, max:5 }),
       ctl('wi_invalid','Then send to','segmented','Operator',{ options:['Operator','Voicemail','Queue','Hang up'] })]),
    step('Hours','Out of hours','A separate path when the office is closed, including holidays.',
      'The most common IVR complaint is a menu that offers sales at nine in the evening and then rings an empty desk.',
      [ctl('wi_hours','Use business hours','switch',true),
       ctl('wi_open','Opens','slider',9,{ min:0, max:23, unit:':00' }),
       ctl('wi_close','Closes','slider',17,{ min:0, max:23, unit:':00' }),
       ctl('wi_closed','When closed','segmented','Closed message',{ options:['Closed message','Voicemail','Emergency queue'] })]),
    step('Review','Check and apply','The menu, its keys and its fallbacks are written as one dialplan context.',
      'Written to a staging context first and swapped atomically, so a call in progress never lands in a half-built menu.',
      [ctl('wi_attest','Attest this change to memory','switch',true)])
  ],
  voicemail:[
    step('Owner','Whose mailbox?','A mailbox belongs to a person or a team, and that choice changes the greeting and the notifications.',
      'Team mailboxes need several notification addresses and a longer message limit. Personal ones almost never do.',
      [ctl('wv_kind','Mailbox type','segmented','Person',{ options:['Person','Team','Department','Fax'] }),
       ctl('wv_box','Number','select','1005',{ options:['1005','1006','1011','2000'] }),
       ctl('wv_ext','Link to extension','switch',true)]),
    step('Greeting','What callers hear','Unavailable, busy and name greetings, or the default system prompt.',
      'A named greeting reassures the caller they reached the right person. Without one they leave a vaguer, longer, less useful message.',
      [ctl('wv_greet','Greeting','segmented','Record now',{ options:['System default','Record now','Text to speech'] }),
       ctl('wv_busy','Separate busy greeting','switch',false),
       ctl('wv_name','Record the name for the directory','switch',true)]),
    step('Delivery','Where messages go','Email, storage backend and whether the recording is kept on the PBX.',
      'Deleting after emailing means the only copy lives in a mail server you may not control. It is a legitimate choice, but make it deliberately.',
      [ctl('wv_email','Email a copy','switch',true),
       ctl('wv_attach','Attach the recording','switch',true),
       ctl('wv_delete','Delete from the PBX after emailing','switch',false),
       ctl('wv_format','Format','segmented','wav49',{ options:['wav','wav49','gsm','ogg'] })]),
    step('Limits','Length and quantity','How long a message may be and how many the box holds.',
      'Three minutes is generous. Beyond that people ramble and nobody listens to the end anyway.',
      [ctl('wv_max','Maximum message length','slider',180,{ min:15, max:600, step:15, unit:'s' }),
       ctl('wv_min','Discard shorter than','slider',3,{ min:0, max:30, unit:'s' }),
       ctl('wv_count','Maximum messages','stepper',100,{ min:1, max:1000 }),
       ctl('wv_full','When full','segmented','Reject politely',{ options:['Reject politely','Overwrite oldest','Forward on'] })]),
    step('Review','Check and apply','The mailbox and its extension link are written together.',
      'The mailbox appears immediately; the message-waiting light on the phone updates on the next registration refresh.',
      [ctl('wv_attest','Attest this change to memory','switch',true)])
  ],
  security:[
    step('Exposure','What is reachable from where?','Start with the honest answer, because every later recommendation depends on it.',
      'The overwhelming majority of compromised PBXes were reachable from the whole internet with a weak secret. Exposure is the single variable that matters most.',
      [ctl('ws_exposed','Reachable from the internet','switch',false),
       ctl('ws_users','Remote workers','switch',true),
       ctl('ws_carriers','Carrier trunks','stepper',2,{ min:0, max:20 })]),
    step('Networks','Who may talk to us','Named access lists applied to transports and endpoints.',
      'An allow-list of your own networks plus your carrier stops almost every automated attack before authentication is even attempted.',
      [ctl('ws_acl','Access list','select','trusted-nets',{ options:['trusted-nets','branch-offices','carrier-only','deny-all'] }),
       ctl('ws_nets','Permit','chips',['10.20.0.0/16'],{ options:['10.20.0.0/16','198.51.100.0/24','192.0.2.0/24','0.0.0.0/0'] }),
       ctl('ws_ban','Ban after failed attempts','stepper',5,{ min:0, max:50 }),
       ctl('ws_bantime','Ban for','slider',600,{ min:60, max:86400, step:60, unit:'s' })]),
    step('Transport','Certificates and ciphers','TLS for signalling, SRTP or DTLS for media.',
      'Encrypting signalling but not media is common and half useless — the conversation itself still crosses the network in the clear.',
      [ctl('ws_cert','Certificate','select','pbx.example.com',{ options:['pbx.example.com','wildcard.example.com','internal-ca-issued'] }),
       ctl('ws_method','TLS version','segmented','tlsv1_3',{ options:['tlsv1_2','tlsv1_3'] }),
       ctl('ws_media','Media encryption','segmented','sdes',{ options:['no','sdes','dtls'] }),
       ctl('ws_verify','Verify client certificates','switch',false)]),
    step('Identity','STIR/SHAKEN','Signed caller identity on outbound calls, verification on inbound.',
      'Attestation A means you know the caller and their right to that number. Claiming A when you cannot prove it is worse than claiming C honestly.',
      [ctl('ws_stir','Sign outbound calls','switch',true),
       ctl('ws_level','Attestation level','segmented','A',{ options:['A','B','C'] }),
       ctl('ws_vin','Verify inbound','switch',true),
       ctl('ws_fail','On failed verification','segmented','Tag',{ options:['Continue','Tag','Reject'] })]),
    step('Dialing','Toll fraud limits','Caps that make a stolen credential boring rather than expensive.',
      'A compromised extension dialling premium numbers overnight is the classic loss. A per-endpoint spend cap turns a catastrophe into an annoyance.',
      [ctl('ws_intl','Allow international calls','switch',false),
       ctl('ws_cap','Concurrent outbound calls','stepper',10,{ min:1, max:200 }),
       ctl('ws_night','Block outside business hours','switch',true),
       ctl('ws_alert','Alert on unusual destinations','switch',true)]),
    step('Review','Check and apply','A single security posture written across pjsip, acl and stir_shaken.',
      'Applied in one transaction. If any part fails validation nothing is written, so you never end up half hardened.',
      [ctl('ws_attest','Attest this change to memory','switch',true)])
  ],
  cli:[
    step('Goal','What do you want to know or do?','The console maps the outcome to a real command instead of making you remember it.',
      'Asterisk has several hundred CLI commands and no discoverable naming scheme. Choosing by outcome is the only humane route in.',
      [ctl('wc_goal','I want to','segmented','Inspect something',{ options:['Inspect something','Reload something','Change a value','Test a call'] }),
       ctl('wc_area','Area','select','pjsip',{ options:['pjsip','dialplan','queue','core','module','database'] })]),
    step('Target','On what?','Only the objects that exist on this PBX right now are offered, so an invalid command cannot be assembled.',
      'Commands are validated against the modules actually loaded, which is why the list here is shorter than the documentation.',
      [ctl('wc_target','Object','select','endpoints',{ options:['endpoints','contacts','registrations','channels','aors','auths'] }),
       ctl('wc_filter','Narrow to','segmented','Everything',{ options:['Everything','One object','Matching a pattern'] })]),
    step('Safety','How risky is this?','The console classifies the command and tells you what it will touch.',
      'A reload is not free: it re-reads configuration and can drop calls that are mid-negotiation, which is why even read-mostly commands are classified.',
      [ctl('wc_dry','Dry run first','switch',true),
       ctl('wc_confirm','Confirmation','segmented','Full ceremony',{ options:['Full ceremony','Spend a credit','None'] }),
       ctl('wc_log','Record the output to history','switch',true)]),
    step('Review','Run it','The assembled command, what it does, and what it will not do.',
      'Output is captured to local history so you can compare today with last week without running it twice.',
      [ctl('wc_attest','Attest this run to memory','switch',true)])
  ],
  modules:[
    step('Goal','Load or unload?','Module changes take effect immediately and can drop calls.',
      'Unloading a channel driver hangs up every call it owns, instantly, with no warning to either party.',
      [ctl('wm_action','Action','segmented','Load',{ options:['Load','Unload','Reload'] }),
       ctl('wm_module','Module','select','res_stir_shaken.so',{ options:['res_stir_shaken.so','app_confbridge.so','cdr_odbc.so','chan_iax2.so'] })]),
    step('Impact','What breaks','Live use counts and dependants, read from the running system.',
      'A module with a non-zero use count is actively serving calls. Unloading it is not a configuration change, it is an outage.',
      [ctl('wm_force','Force even with active users','switch',false),
       ctl('wm_when','When','segmented','Now',{ options:['Now','When idle','At a scheduled time'] })]),
    step('Persistence','Next restart','Whether the change survives a restart of Asterisk.',
      'Making a change live but not persistent is the classic way to be confused three weeks later after an unrelated reboot.',
      [ctl('wm_persist','Write to modules.conf','switch',true),
       ctl('wm_preload','Preload at startup','switch',false)]),
    step('Review','Check and apply','Module action, persistence and rollback plan.',
      'If the module fails to load, the console reverts modules.conf automatically and tells you what the loader said.',
      [ctl('wm_attest','Attest this change to memory','switch',true)])
  ],
  memory:[
    step('Scope','What are you searching?','Corpus, scope and depth. This sets what the regex builder runs against.',
      'Searching everything is slower and noisier. Scoping to projects or extensions usually finds the answer in one pass.',
      [ctl('wy_scope','Corpus','segmented','All memory',{ options:['All memory','Projects','Extensions','Shared instructions'] }),
       ctl('wy_depth','Include archived','switch',false)]),
    step('Pattern','Build the pattern','The same regex builder as every search field, opened with your scope already applied.',
      'Building a pattern from labelled pieces means you can read it back a month later, which is not true of a regex you typed in a hurry.',
      [ctl('wy_case','Ignore case','switch',true),
       ctl('wy_whole','Whole words only','switch',false),
       ctl('wy_limit','Maximum results','stepper',200,{ min:10, max:2000 })]),
    step('Output','What to do with matches','Review, export, or feed them into a sync.',
      'Exported matches carry their source line numbers, so an audit can be repeated exactly.',
      [ctl('wy_out','Result action','segmented','Review here',{ options:['Review here','Export JSON','Export Markdown'] }),
       ctl('wy_guard','Run the emission guard over the output','switch',true)]),
    step('Review','Run the search','Scope, pattern and output in one line.',
      'The emission guard runs before anything is written or displayed, so a forbidden term cannot leave the process.',
      [ctl('wy_attest','Record this search in the ledger','switch',false)])
  ],
  _default:[
    step('Purpose','What are you changing?','Pick the outcome you want. The console maps it to the right options rather than making you find them.',
      'Most settings on this screen only matter in combination. Answering by outcome means the console can set three related options consistently instead of leaving you to discover the third one later.',
      [ctl('wd_goal','Goal','segmented','Recommended defaults',{ options:['Recommended defaults','Tighten security','Maximise compatibility','Custom'] }),
       ctl('wd_scope','Apply to','segmented','This object',{ options:['This object','All on this screen','Global default'] })]),
    step('Adjust','Fine tune','Everything the goal changed, shown so nothing happens invisibly.',
      'Anything you touch here overrides the goal for that one option and is marked as a manual override in the review step.',
      [ctl('wd_level','Strictness','slider',3,{ min:1, max:5 }),
       ctl('wd_log','Log every change','switch',true),
       ctl('wd_notify','Notify on drift','switch',true)]),
    step('Review','Check and apply','The exact change, then four gates.',
      'Nothing is written until the ceremony completes, and the previous state is captured first so undo is always possible.',
      [ctl('wd_attest','Attest this change to memory','switch',true)])
  ]
};

const ONBOARD = [
  { icon:'rocket_launch', t:'Let us build you a phone system', b:'This console exists to stand up a working PBX from nothing. Deploying is the main road; connecting to something that already exists is the side road. Pick one.', ctls:[
    ctl('ob_intent','What are we doing?','segmented','Deploy a new server',{ options:['Deploy a new server','Connect to an existing one'], info:'Deploy provisions Asterisk from scratch — packages, config, extensions, certificates and hardening. Connect attaches this console to a PBX somebody already built.' }),
    ctl('ob_ease','How much do you want to decide?','segmented','Super easy',{ options:['Super easy','Guided','Every detail'], info:'Super easy asks three questions and does the rest. Guided walks each area. Every detail opens the full option set with nothing hidden.' })] },
  { icon:'help_center', t:'Three questions, that is all', b:'On Super easy this is the entire interview. Everything else is chosen for you using the defaults a working office uses, and every one of them stays editable afterwards.', ctls:[
    ctl('ob_phones','How many phones?','stepper',8,{ min:1, max:500 }),
    ctl('ob_menu','Do callers hear a menu before a human?','switch',true),
    ctl('ob_hours','Do you close at night?','switch',true,{ info:'Recorded as a preference only — a real schedule needs actual open/close times, which this wizard does not ask for. Set it up afterward in Configure > Dialplan.' })] },
  { icon:'dns', t:'Where should it run?', b:'The console can provision onto this machine, a container, or a server over SSH. It checks the target is reachable and has room before it starts.', ctls:[
    ctl('ob_where','Target','segmented','This machine',{ options:['This machine','Local Docker','SSH','SSH Docker'] }),
    ctl('ob_host','Host','select','pbx-hq.internal',{ options:['localhost','pbx-hq.internal','pbx-branch.internal','10.20.4.10'] }),
    ctl('ob_tls','Encrypt everything','switch',true)] },
  { icon:'shield_lock', t:'Change control', b:'Destructive actions run a four-gate ceremony: an operator key, a held arming switch, a slide-to-commit and a five-target attention check. Every change also commits to a local git repository.', ctls:[
    ctl('ob_gates','Confirmation','segmented','All four gates',{ options:['All four gates','Key and switch only','Credits allowed'] }),
    ctl('ob_log','Attest every change to memory','switch',true)] },
  { icon:'bolt', t:'Ready to deploy', b:'One press and the console provisions the server, creates your extensions, builds the menu, sets the hours, issues certificates and hardens the lot. Roughly seven seconds, narrated.', ctls:[
    ctl('ob_tour','Take the tour afterwards','switch',true)] }
];

const TOUR = [
  { t:'The rail', b:'Six areas. Telephony, media, records, system, the agent memory layer, and this app.', x:'110px', y:'120px' },
  { t:'Section list', b:'Each area holds its screens. The badge shows how many objects live there right now.', x:'380px', y:'160px' },
  { t:'Every control is a control', b:'Switches, sliders, steppers, chips and pickers. The only free text anywhere is a name.', x:'620px', y:'320px' },
  { t:'Explain button', b:'Every screen and every setting has one. It explains the idea as if you learned what a telephone was yesterday.', x:'720px', y:'90px' },
  { t:'Guided wizard', b:'Opens beside the live configuration so you can watch it change as you answer.', x:'880px', y:'90px' }
];

const CLI_STEPS = [
  { id:'verb', label:'Action', options:['core','pjsip','dialplan','queue','module','database'] },
  { id:'obj', label:'Object', options:['show','reload','set','restart'] },
  { id:'target', label:'Target', options:['endpoints','channels','contacts','registrations'] }
];

class ConsoleShell extends DCLogic {
  state = {
    railId:'pbx', screen:'dash', mode:'Beginner', values:{},
    infoOpen:false, infoTitle:'', infoBody:'', infoPlain:'', infoX:'50%', infoY:'160px', infoDoc:null, infoKey:'',
    wizardOpen:false, wizardStep:0, wizardCtl:null, paletteOpen:false,
    ceremonyOpen:false, cStep:0, keyTurned:false, holdMs:0, slideVal:0, moleHits:0, moleTime:15, moleIdx:-1, ceremonyTitle:'', ceremonyCmd:'',
    onboardOpen:true, onboardStep:0, tourOpen:false, tourStep:0,
    toastOpen:false, toastText:'', nodeId:'n1', zoom:100, tableFilter:'All',
    cli:{ verb:'pjsip', obj:'show', target:'endpoints' },
    regex:['^memory/', 'projects', '\\.md$'],
    patterns:{ nav:[], table:[], memory:['^memory/', 'projects'] },
    regexOpen:false, regexTarget:'nav', regexX:'300px', regexY:'120px', regexFlags:['i'],
    ctxOpen:false, ctxX:'0px', ctxY:'0px', ctxTarget:'', ctxKind:'screen', ctxMenuId:'',
    locks:{}, lockOpen:false, lockTarget:'', lockKey:'', lockStep:0, lockMethod:'PIN', pin:'', password:'', pinReveal:false, lockX:'40%', lockY:'22%',
    credits:3, game:'whack', gameScore:0, gameTime:0, gameCell:-1, gamePlaying:false,
    dtmfSeq:['4','7','2','9'], dtmfIn:[], dtmfShow:true,
    sortList:['ulaw · 64 kbps','opus · 128 kbps','g729 · 8 kbps','g722 · 64 kbps','gsm · 13 kbps'],
    matchSel:'', matchDone:[], spotFound:-1, reflexNum:'1004', selected:[], authAnswers:{},
    sureOpen:false, sureTitle:'', sureBody:'', sureHits:0, sureNeed:3, sureCell:-1, sureAction:null,
    tabs:['dash', 'endpoints', 'canvas'], pinned:['dash'], dock:'left',
    nodePos:{}, edgeList:EDGES.map(e => e.slice()), nodeDrag:null, fullscreen:false,
    canvasTool:'select', grid:true, snap:true, guides:true, minimap:true, layer:'Dialplan',
    tabNames:{}, tabColours:{}, ctxTabKey:'', renameOpen:false, renameKey:'', renameValue:'', tabColourOpen:false,
    tabFilterOpen:false, tabFilterMode:'has', tabFilterText:'', ctxSub:'',
    rxText:'', rxManual:false, tabFilterColour:'', rndNonce:1,
    tabDrag:-1, tabOver:-1, groups:[], ctxGroupId:'', groupRenameOpen:false,
    branch:'main', commits:[
      { sha:'8f2a1c4', file:'queues.conf', screen:'queues', key:'q_strategy', label:'strategy', from:'ringall', to:'leastrecent', when:'12 min ago', author:'you', branch:'main', tag:'' },
      { sha:'2d90b17', file:'pjsip.conf', screen:'endpoints', key:'e_encryption', label:'media_encryption', from:'no', to:'sdes', when:'1 h ago', author:'you', branch:'main', tag:'v3.2.0' },
      { sha:'a41e88d', file:'logger.conf', screen:'logger', key:'g_size', label:'Rotate at', from:'20', to:'50', when:'3 h ago', author:'wizard', branch:'main', tag:'' },
      { sha:'c07bb52', file:'pjsip.conf', screen:'endpoints', key:'e_maxcontacts', label:'max_contacts', from:'1', to:'2', when:'yesterday', author:'you', branch:'hardening', tag:'' },
      { sha:'5be3390', file:'acl.conf', screen:'security', key:'s_guest', label:'Allow guest calls', from:'yes', to:'no', when:'2 d ago', author:'you', branch:'main', tag:'' }
    ], histSel:'', histFilter:'All', histCompare:[],
    drag:null, dlgPos:{}, dlgDock:{ appear:'right', wizard:'right' }, dlgSize:{}, resize:null,
    unlockOpen:false, unlockKey:'', unlockPin:'', unlockPw:'',
    appearOpen:false, appearTarget:'', appearState:'Default',
    oneClickMode:'Funny', oneClickRunning:false, oneClickStep:0,
    celebrate:false, celebrateTitle:'', celebrateSub:''
  };

  fire = (title, sub) => {
    this.setState({ celebrate:true, celebrateTitle:title, celebrateSub:sub });
    clearTimeout(this._cf);
    this._cf = setTimeout(() => this.setState({ celebrate:false }), 2600);
  };

  set = (k, v) => this.setState(s => ({ [k]:v }));
  val = (c) => (this.state.values[c.id] !== undefined ? this.state.values[c.id] : c.value);
  toast = (t) => { this.setState({ toastOpen:true, toastText:t }); clearTimeout(this._tt); this._tt = setTimeout(() => this.setState({ toastOpen:false }), 4200); };

  commit = (c, v) => {
    const file = (SCREENS[this.state.screen] || {}).file || 'console';
    const sha = Math.random().toString(16).slice(2, 9);
    const entry = { sha, file, screen:this.state.screen, key:c.id, label:c.label,
      from:(this.state.values[c.id] !== undefined ? this.state.values[c.id] : c.value), to:v,
      when:'just now', author:'you', branch:this.state.branch, tag:'' };
    this.setState(st => ({ commits:[entry].concat(st.commits).slice(0, 400) }));
  };

  setVal = (c, v) => {
    this.commit(c, v);
    this.setState(s => ({ values:Object.assign({}, s.values, { [c.id]:v }) }));
    const shown = Array.isArray(v) ? (v.length ? v.join(', ') : 'nothing') : String(v);
    this.toast(c.label + ' set to ' + shown);
    const id = c.id || '';
    if (v === true && /encrypt|tls|guard|lock|hostkey|attest|verify|strict|backup|stir/i.test(id + c.label)) this.fire('Safer already', c.label + ' is on. Somewhere an auditor smiled.');
    else if (v === false && /encrypt|tls|guard|lock|hostkey|attest|verify|strict|stir/i.test(id + c.label)) this.toast('⚠ ' + c.label + ' is off — that is a real reduction in security');
    else if (c.kind === 'order') this.toast(c.label + ' reordered — ' + (v[0] || 'nothing') + ' is now offered first');
    else if (v === true) this.fire('Nice', c.label + ' switched on.');
  };

  simulate() {
    const c = this._lastCtl;
    if (!c) return [];
    const v = this.state.values['play_' + c.id] !== undefined ? this.state.values['play_' + c.id] : this.val(c);
    const on = v === true || v === 'yes' || v === 'sdes' || v === 'dtls';
    const id = c.id;
    const g = '#82D9A5', w = '#FFD68A', r = '#FFB4AB', d = '#8FA394';
    const L = (text, colour, icon) => ({ text, colour, icon:icon || 'chevron_right' });
    if (/encryption|tls|encrypt/.test(id)) return [
      L('INVITE sip:1001@pbx  →  ' + (on ? 'over TLS' : 'over UDP'), on ? g : w),
      L('SDP offers ' + (on ? 'RTP/SAVP with a crypto line' : 'RTP/AVP, no crypto'), on ? g : w),
      L(on ? 'Media keys exchanged; audio is encrypted' : 'Media keys absent; audio is readable on the wire', on ? g : r, on ? 'lock' : 'lock_open'),
      L('200 OK  ·  call up in 240 ms', d)
    ];
    if (/direct/.test(id)) return [
      L('Call answers between 1001 and 1002', d),
      L(on ? 'Asterisk sends re-INVITE, steps out of the media path' : 'Asterisk stays in the media path', on ? w : g),
      L(on ? 'Audio flows phone → phone directly' : 'Audio flows phone → Asterisk → phone', on ? w : g, 'graphic_eq'),
      L(on ? 'MixMonitor would capture silence' : 'MixMonitor captures both legs', on ? r : g, on ? 'error' : 'check_circle')
    ];
    if (/dtmf/.test(id)) return [
      L('Caller reaches the IVR and presses 4', d),
      L('Tone travels as ' + (String(v) === 'inband' ? 'audio inside the RTP stream' : String(v)), String(v) === 'inband' ? w : g),
      L(String(v) === 'inband' ? 'g729 compression distorts the tone' : 'Event arrives intact as digit 4', String(v) === 'inband' ? r : g, String(v) === 'inband' ? 'error' : 'check_circle'),
      L(String(v) === 'inband' ? 'IVR hears nothing; caller presses 4 again' : 'IVR branches to the support queue', String(v) === 'inband' ? r : g)
    ];
    if (/strategy/.test(id)) return [
      L('Call arrives; 6 members, 4 free', d),
      L('Strategy ' + v + ' selects ' + ({ ringall:'all 4 free members at once', leastrecent:'the member idle longest', fewestcalls:'the member with the fewest calls today', random:'one at random', rrmemory:'the next member in rotation', linear:'the first member in the list', wrandom:'a weighted random member' }[v] || v), g),
      L('Rings for ' + this.val({ id:'q_timeout', value:15 }) + ' s', d),
      L(v === 'ringall' ? 'Answered in 4 s — fastest, but 4 phones rang' : 'Answered in 9 s — one phone rang, load spread evenly', g, 'check_circle')
    ];
    if (/qualify/.test(id)) return [
      L('OPTIONS ping every ' + v + ' s', d),
      L(Number(v) === 0 ? 'Pings disabled — reachability unknown' : 'Round trip 22 ms, endpoint marked Reachable', Number(v) === 0 ? w : g),
      L(Number(v) === 0 ? 'A dead phone stays listed as available' : 'A dead phone is detected within ' + v + ' s', Number(v) === 0 ? r : g, Number(v) === 0 ? 'error' : 'check_circle'),
      L('12 endpoints × ' + (Number(v) ? Math.round(3600 / Number(v)) : 0) + ' pings/hour', d)
    ];
    if (/maxcontacts/.test(id)) return [
      L('Desk phone registers  →  contact 1 of ' + v, g),
      L(Number(v) > 1 ? 'Mobile app registers → contact 2 of ' + v : 'Mobile app registers → rejected, limit reached', Number(v) > 1 ? g : w),
      L('Inbound call rings ' + Math.min(Number(v) || 1, 2) + ' device(s)', d, 'call'),
      L(Number(v) > 3 ? 'A stolen credential could add ' + (Number(v) - 1) + ' more devices unnoticed' : 'Attack surface is small', Number(v) > 3 ? r : g, Number(v) > 3 ? 'warning' : 'check_circle')
    ];
    if (/guest/.test(id)) return [
      L('Unauthenticated INVITE from 203.0.113.9', d),
      L(on ? 'Accepted as a guest call' : 'Rejected with 403 Forbidden', on ? r : g, on ? 'error' : 'shield'),
      L(on ? 'Enters the default context and may dial out' : 'No context entered; nothing reachable', on ? r : g),
      L(on ? 'This is the toll-fraud path' : 'Attempt logged and rate-limited', on ? r : g)
    ];
    return [
      L('Configuration written: ' + id + ' = ' + (Array.isArray(v) ? v.join(',') : v), g),
      L('Module reload requested', d),
      L('Validation passed', g, 'check_circle'),
      L('Next call uses the new value', d)
    ];
  }

  simVerdict() {
    const steps = this.simulate();
    const bad = steps.some(s => s.colour === '#FFB4AB');
    const warn = steps.some(s => s.colour === '#FFD68A');
    if (bad) return { text:'This combination has a real failure mode. Read the gotcha above before choosing it.', colour:'#FFB4AB', icon:'error' };
    if (warn) return { text:'Workable, but it gives something up. Fine if that is deliberate.', colour:'#FFD68A', icon:'warning' };
    return { text:'This is a healthy configuration. Nothing surprising happens.', colour:'#82D9A5', icon:'check_circle' };
  }

  simWire() {
    const c = this._lastCtl;
    if (!c) return '';
    const v = this.state.values['play_' + c.id] !== undefined ? this.state.values['play_' + c.id] : this.val(c);
    const file = this.ownerFile(c);
    return '; ' + file + ' (playground only — not written)\n' + c.id + ' = ' + (Array.isArray(v) ? v.join(',') : v);
  }

  showDoc = (c) => {
    this._lastCtl = c;
    const d = this.docFor(c);
    this.setState({ infoOpen:true, infoDoc:d, infoTitle:c.label, infoKey:c.id,
      infoBody:d.summary, infoPlain:d.plainWords, infoX:'44%', infoY:'110px' });
    return true;
  };

  showInfo = (title, body, plain, x, y) => this.setState({ infoOpen:true, infoTitle:title, infoBody:body, infoPlain:plain || 'Nothing here can break a live call on its own. Changing it only takes effect after you clear the confirmation gates.', infoX:x || '46%', infoY:y || '170px' });

  ceremony = (title, cmd) => this.setState({ ceremonyOpen:true, ceremonyTitle:title, ceremonyCmd:cmd, cStep:0, keyTurned:false, holdMs:0, slideVal:0, moleHits:0, moleTime:15, moleIdx:-1 });

  componentWillUnmount() { clearInterval(this._reroll); window.removeEventListener('mousemove', this._mm); window.removeEventListener('mouseup', this._mu); clearInterval(this._hold); clearInterval(this._mole); clearTimeout(this._tt); clearInterval(this._g); clearInterval(this._oc); clearTimeout(this._cf); }

  areYouSure = (title, body, need, action) => this.setState({ sureOpen:true, sureTitle:title, sureBody:body, sureNeed:need || 3, sureHits:0, sureCell:Math.floor(Math.random() * 8), sureAction:action });

  answerAuth = (r, ans) => {
    if (ans === 'YES' && r.risk === 'High risk') {
      return this.areYouSure('Sending YES to ' + r.partner, 'You are about to tell ' + r.partner + ' that ' + r.title.toLowerCase() + ' is approved. This widens who may deliver calls onto your PBX and it takes effect on their side within minutes.', 4, () => {
        this.setState({ authAnswers:Object.assign({}, this.state.authAnswers, { [r.id]:'YES' }) });
        this.fire('YES sent', r.partner + ' has been told. Signed and logged.');
      });
    }
    this.setState({ authAnswers:Object.assign({}, this.state.authAnswers, { [r.id]:ans }) });
    if (ans === 'YES') this.fire('YES sent', r.partner + ' has been told. Signed and logged.');
    else this.toast('NO sent to ' + r.partner + ' — nothing on the link changed');
  };

  openScreen = (k) => this.setState(st => ({ rndNonce:st.rndNonce + 1, screen:k, railId:SCREENS[k] ? SCREENS[k].rail : st.railId }));

  componentDidMount() {
    this._reroll = setInterval(() => { if (this.state.values.fun_random === true && this.state.values.fun_random_reroll === true) this.setState(st => ({ rndNonce:st.rndNonce + 1 })); }, 2600);
    this._mm = (e) => {
      const rz = this.state.resize;
      if (rz) {
        const sizes = Object.assign({}, this.state.dlgSize);
        sizes[rz.key] = { w:Math.max(300, Math.round(rz.w + (e.clientX - rz.x))), h:Math.max(220, Math.round(rz.h + (e.clientY - rz.y))) };
        return this.setState({ dlgSize:sizes });
      }
      const d = this.state.drag;
      if (!d) return;
      const pos = Object.assign({}, this.state.dlgPos);
      pos[d.key] = { x:(e.clientX - d.dx) + 'px', y:(e.clientY - d.dy) + 'px' };
      this.setState({ dlgPos:pos });
    };
    this._mu = () => { if (this.state.drag || this.state.resize) this.setState({ drag:null, resize:null }); };
    window.addEventListener('mousemove', this._mm);
    window.addEventListener('mouseup', this._mu);
  }

  startResize = (key) => (e) => {
    if (e.stopPropagation) e.stopPropagation();
    if (e.preventDefault) e.preventDefault();
    let el = e.currentTarget;
    while (el && el.parentElement && getComputedStyle(el).position !== 'absolute') el = el.parentElement;
    const r = (el || e.currentTarget).getBoundingClientRect();
    this.setState({ resize:{ key, x:e.clientX, y:e.clientY, w:r.width, h:r.height } });
  };

  startDrag = (key) => (e) => {
    if ((this.state.dlgDock[key] || 'float') !== 'float') return;
    let el = e.currentTarget;
    while (el && el.parentElement && getComputedStyle(el).position !== 'absolute') el = el.parentElement;
    const r = (el || e.currentTarget).getBoundingClientRect();
    if (e.preventDefault) e.preventDefault();
    this.setState({ drag:{ key, dx:e.clientX - r.left, dy:e.clientY - r.top } });
  };

  pos = (key, fx, fy) => { const p = this.state.dlgPos[key]; return p ? [p.x, p.y] : [fx, fy]; };

  dockChrome = (key, fx, fy, w) => {
    const mode = this.state.dlgDock[key] || 'float';
    const sized = this.state.dlgSize[key];
    const width = sized ? sized.w : (w || 420);
    const heightOverride = sized ? sized.h + 'px' : null;
    const geo = {
      float:{ left:this.pos(key, fx, fy)[0], top:this.pos(key, fx, fy)[1], width:width + 'px', height:heightOverride || 'auto', radius:'18px', anim:this.state.dlgPos[key] ? 'none' : 'm3Rise .2s cubic-bezier(.2,0,0,1)' },
      left:{ left:'0px', top:'78px', width:width + 'px', height:'calc(100vh - 78px)', radius:'0 18px 18px 0', anim:'dlgRegex .26s cubic-bezier(.2,0,0,1)' },
      right:{ left:'auto', top:'78px', width:width + 'px', height:'calc(100vh - 78px)', radius:'18px 0 0 18px', anim:'dlgAppear .26s cubic-bezier(.2,0,0,1)' },
      top:{ left:'0px', top:'78px', width:'100vw', height:'46vh', radius:'0 0 18px 18px', anim:'dlgFilter .26s cubic-bezier(.2,0,0,1)' },
      bottom:{ left:'0px', top:'auto', width:'100vw', height:'46vh', radius:'18px 18px 0 0', anim:'m3Slide .26s cubic-bezier(.2,0,0,1)' },
      centre:{ left:'50%', top:'12vh', width:width + 'px', height:'auto', radius:'24px', anim:'dlgSure .3s cubic-bezier(.2,1.2,.3,1)' }
    }[mode];
    const extra = (mode === 'right' ? 'right:0;' : '') + (mode === 'bottom' ? 'bottom:0;' : '') + (mode === 'centre' ? 'transform:translateX(-50%);' : '');
    return {
      resize:this.startResize(key),
      style:'left:' + geo.left + '; top:' + geo.top + '; width:' + geo.width + '; height:' + geo.height + '; border-radius:' + geo.radius + '; animation:' + geo.anim + '; ' + extra,
      mode,
      options:[
        { icon:'open_with', label:'Floating', v:'float' },
        { icon:'chevron_left', label:'Dock left', v:'left' },
        { icon:'chevron_right', label:'Dock right', v:'right' },
        { icon:'expand_less', label:'Dock top', v:'top' },
        { icon:'expand_more', label:'Dock bottom', v:'bottom' },
        { icon:'filter_center_focus', label:'Centre', v:'centre' }
      ].map(o => Object.assign({}, o, {
        on:mode === o.v, off:mode !== o.v,
        pick:() => this.setState(st => ({ dlgDock:Object.assign({}, st.dlgDock, { [key]:o.v }) }))
      })),
      floating:mode === 'float'
    };
  };

  ownerFile(c) {
    const id = c.id || '';
    const map = { e_:'pjsip.conf', t_:'pjsip.conf', w_:'pjsip.conf', q_:'queues.conf', wq_:'queues.conf', v_:'voicemail.conf', wv_:'voicemail.conf', i_:'extensions.conf', wi_:'extensions.conf', dp_:'extensions.conf', c_:'confbridge.conf', h_:'musiconhold.conf', k_:'codecs.conf', r_:'rtp.conf', d_:'cdr.conf', l_:'cel.conf', a_:'manager.conf', mo_:'modules.conf', g_:'logger.conf', fx_:'res_fax.conf · udptl.conf', s_:'acl.conf · stir_shaken.conf', ws_:'acl.conf · stir_shaken.conf', sv_:'connection profile', ob_:'connection profile', bs_:'provisioning', ta_:'pjsip.conf', hi_:'.git config', y_:'agent memory', u_:'skills', b_:'status hub', n_:'vocabulary', o_:'release', x_:'secret intake', cr_:'arcade', nt_:'console', p_:'console settings', z_:'console', fun_:'console profile', mo2_:'console profile', ly_:'console profile', th_:'console profile', bh_:'console profile', pr_:'console profile', ap_:'appearance overrides', cp_:'appearance overrides', lk_:'lock store' };
    const k = Object.keys(map).find(p => id.indexOf(p) === 0);
    return k ? map[k] : ((SCREENS[this.state.screen] || {}).file || 'the console profile');
  }

  docFor(c) {
    const file = this.ownerFile(c);
    const v = this.val(c);
    const shown = Array.isArray(v) ? (v.join(', ') || 'nothing') : String(v);
    const kindLine = {
      switch:'Boolean. Written as yes or no.',
      segmented:'One of a fixed set. Written verbatim.',
      select:'One of a fixed set, validated against this build.',
      chips:'A comma-separated list. Order is not significant.',
      slider:'An integer' + (c.unit ? ' in ' + c.unit.trim() : '') + ' between ' + c.min + ' and ' + c.max + '.',
      stepper:'An integer between ' + c.min + ' and ' + c.max + '.',
      order:'An ordered list. Written in this exact order; the first entry is offered first.',
      text:'A free string. The only typed value in this area.'
    }[c.kind] || 'A value.';
    const opts = (c.options || []).length ? (c.options || []).join(' | ') : (c.kind === 'switch' ? 'yes | no' : (c.min !== undefined ? c.min + ' … ' + c.max : '—'));
    const risky = /encrypt|tls|guest|direct_media|force|trust|delete|guard|lock|strict|stir|sign|allow|acl|permit/i.test(c.id + ' ' + c.label);
    const live = /qualify|timeout|wrapup|ring|retry|maxlen|service|codec|allow|dtmf|media/i.test(c.id + ' ' + c.label);
    const D = DOCS[c.id];
    if (D) {
      return {
        summary:D.what,
        spec:[
          { k:'Key', v:c.id }, { k:'File', v:file }, { k:'Type', v:kindLine }, { k:'Accepts', v:opts },
          { k:'Default', v:String(Array.isArray(c.value) ? c.value.join(', ') : c.value) },
          { k:'Current', v:shown },
          { k:'Takes effect', v:live ? 'On the next call.' : 'On the next module reload.' },
          { k:'Values', v:D.values },
          { k:'Risk', v:risky ? 'Security relevant.' : 'Low.' },
          { k:'Reversible', v:'Yes — committed to git before the write.' }
        ],
        why:D.why, valuesText:D.values, gotcha:D.gotcha,
        whenToChange:D.why,
        seeAlso:D.gotcha,
        plainWords:D.what
      };
    }
    return {
      summary:(c.info || ('Controls ' + c.label.toLowerCase() + '. This setting is written to ' + file + ' as ' + c.id + ' and read by Asterisk when the owning module reloads.')),
      spec:[
        { k:'Key', v:c.id },
        { k:'File', v:file },
        { k:'Type', v:kindLine },
        { k:'Accepts', v:opts },
        { k:'Default', v:String(Array.isArray(c.value) ? c.value.join(', ') : c.value) },
        { k:'Current', v:shown },
        { k:'Takes effect', v:live ? 'On the next call. Calls already up keep their negotiated behaviour.' : 'On the next module reload.' },
        { k:'Reload needed', v:live ? 'module reload' : 'none — applied on write' },
        { k:'Risk', v:risky ? 'Security relevant. Changing it alters trust or protection.' : 'Low. Worst case is one endpoint behaving oddly.' },
        { k:'Reversible', v:'Yes. The previous value is committed to git before the write.' }
      ],
      whenToChange:risky
        ? 'Change it when a specific requirement forces you to — a carrier that will not negotiate, a regulator, a device too old to speak the modern option. Not because it appeared in a forum post.'
        : 'Change it when the default does not match how your office actually works. There is no harm in trying and reverting.',
      seeAlso:(c.kind === 'order' ? 'Codec order also appears globally under Media, and the per-endpoint list overrides it.'
        : (risky ? 'Related settings live under Security, and every change here shows in History with a full diff.'
        : 'History records the change, and the guided wizard for this setting walks the same decision in four steps.')),
      plainWords:'If you have never seen a phone system before: ' + (c.info ? c.info.split('.')[0].toLowerCase() + '.' : 'this is one small dial on a very large machine, and the value it already has is the one most people leave it at.')
    };
  }

  plain(c) {
    const map = {
      direct_media:'Let phones send audio straight to each other',
      rtp_symmetric:'Only accept audio from where we sent it',
      force_rport:'Reply to the port the phone actually used',
      rewrite_contact:'Fix addresses for phones behind a router',
      ice_support:'Help phones punch through NAT',
      media_encryption:'Encrypt the audio',
      dtmf_mode:'How keypad presses travel',
      max_contacts:'Devices allowed on this identity',
      qualify_frequency:'How often we check the phone is alive',
      strategy:'Who gets rung first',
      wrapuptime:'Rest between calls',
      ringinuse:'Ring people already on a call',
      autopause:'Pause an agent after a missed call',
      joinempty:'When callers may join an empty queue',
      leavewhenempty:'When callers get pushed out',
      servicelevel:'Answer target',
      autoload:'Load every module we find',
      strictrtp:'Reject audio from unexpected sources'
    };
    return map[c.label] || c.label.replace(/_/g, ' ');
  }

  rnd = (i) => {
    const on = this.state.values.fun_random === true;
    if (!on) return '';
    const seed = (this.state.values.fun_random_seed || 1) * 97 + this.state.rndNonce * 31 + i * 17;
    const q = (n, a, b) => a + ((seed * (n + 3) * 2654435761) % 100000) / 100000 * (b - a);
    const scope = this.state.values.fun_random_scope || ['Colour', 'Radius', 'Shadow'];
    const k = (this.state.values.fun_random_strength === undefined ? 40 : this.state.values.fun_random_strength) / 100;
    const has = (x) => scope.indexOf(x) >= 0;
    const hue = Math.round(q(1, 0, 360));
    const out = [];
    if (has('Colour')) out.push('background:hsl(' + hue + ' ' + Math.round(14 + 26 * k) + '% ' + Math.round(11 + 6 * k) + '%)', 'border:1px solid hsl(' + hue + ' ' + Math.round(30 * k) + '% ' + Math.round(26 + 14 * k) + '%)');
    if (has('Radius')) out.push('border-radius:' + Math.round(q(2, 4, 4 + 44 * k)) + 'px');
    if (has('Shadow')) out.push('box-shadow:0 ' + Math.round(q(3, 0, 16 * k)) + 'px ' + Math.round(q(4, 6, 46 * k)) + 'px rgba(0,0,0,.5)');
    if (has('Type weight')) out.push('font-weight:' + [300, 400, 500, 700][Math.floor(q(5, 0, 3.99))]);
    if (has('Size')) out.push('font-size:' + q(6, 12.5, 12.5 + 5 * k).toFixed(1) + 'px');
    if (has('Rotation')) out.push('transform:rotate(' + q(7, -3 * k, 3 * k).toFixed(2) + 'deg)');
    if (has('Entrance animation')) out.push('animation:' + ['m3Rise', 'm3Pop', 'm3Slide', 'm3Bounce', 'm3Float'][Math.floor(q(8, 0, 4.99))] + ' .4s cubic-bezier(.2,1.2,.35,1)');
    return out.join('; ') + ';';
  };

  randomAppearance = (all) => {
    const r = (a, b) => Math.round(a + Math.random() * (b - a));
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const fun = this.state.values.chaos_level === undefined ? 2 : this.state.values.chaos_level;
    const wild = fun >= 3;
    const next = {
      ap_hue:r(0, 360), ap_sat:r(wild ? 40 : 20, wild ? 100 : 70), ap_light:r(45, 80),
      ap_weight:pick(['300', '400', '500', '700']), ap_size:r(12, wild ? 26 : 18),
      ap_track:r(-1, wild ? 6 : 2), ap_r1:r(0, wild ? 40 : 18), ap_r2:r(0, wild ? 40 : 18),
      ap_r3:r(0, wild ? 40 : 18), ap_r4:r(0, wild ? 40 : 18),
      ap_sy:r(0, wild ? 20 : 8), ap_sb:r(4, wild ? 50 : 20),
      ap_rot:wild ? r(-8, 8) : 0, ap_scale:wild ? r(92, 112) : 100,
      ap_anim:pick(['rise', 'pop', 'wiggle', 'glow', 'sweep']),
      ap_rainbow:wild && Math.random() > 0.55
    };
    this.setState(st => ({ values:Object.assign({}, st.values, next) }));
    this.fire(all ? 'Everything reshuffled' : 'Reshuffled', all ? 'Every element got its own random look.' : 'One element, one new look. Undo is in the history.');
  };

  applyColour = (val) => {
    const key = this.state.renameKey || '';
    const colour = val === 'rainbow' ? 'hsl(148 60% 62%)' : val;
    if (key.indexOf('group:') === 0) {
      const id = key.slice(6);
      this.setState(st => ({ groups:st.groups.map(g => g.id === id ? Object.assign({}, g, { colour }) : g), tabColourOpen:false }));
    } else {
      this.setState(st => ({ tabColours:Object.assign({}, st.tabColours, { [key]:colour }), tabColourOpen:false }));
    }
    this.fire('Colour applied', val === 'rainbow' ? 'It cycles the whole spectrum now.' : 'Set to ' + val + '.');
  };

  tryUnlock = () => {
    const s = this.state;
    const L = s.locks[s.unlockKey];
    if (!L) return this.setState({ unlockOpen:false });
    const m = L.method || 'PIN';
    if (m.indexOf('PIN') >= 0 && s.unlockPin !== L.pin) { this.setState({ unlockPin:'' }); return this.toast('Wrong PIN — the surface stays locked'); }
    if (m.indexOf('Password') >= 0 && (s.unlockPw || '') !== L.password) { this.setState({ unlockPw:'' }); return this.toast('Wrong passphrase — the surface stays locked'); }
    const n = Object.assign({}, s.locks); delete n[s.unlockKey];
    this.setState({ locks:n, unlockOpen:false, unlockPin:'', unlockPw:'' });
    this.fire('Unlocked', 'Welcome back.');
  };

  addEdgeFrom = () => { this.setState(st => ({ edgeList:st.edgeList.concat([[st.nodeId, 'n4']]) })); this.toast('Connection added — pick its target in the inspector'); };

  moveNode = (id, dx, dy) => {
    const base = NODES.find(n => n.id === id);
    const cur = this.state.nodePos[id] || { x:base.x, y:base.y };
    const snap = this.state.snap ? 20 : 1;
    const pos = Object.assign({}, this.state.nodePos);
    pos[id] = { x:Math.max(0, Math.round((cur.x + dx) / snap) * snap), y:Math.max(0, Math.round((cur.y + dy) / snap) * snap) };
    this.setState({ nodePos:pos });
  };

  bulk = (verb, sel) => { this.setState({ selected:[] }); this.fire(verb, sel.length + ' objects in one action.'); };

  stopGameNow = () => { clearInterval(this._g); this.setState({ gamePlaying:false, gameCell:-1, gameTime:0 }); };

  startMoles = () => {
    clearInterval(this._mole);
    this.setState({ moleHits:0, moleTime:15, moleIdx:Math.floor(Math.random() * 12) });
    let t = 15;
    this._mole = setInterval(() => {
      t -= 1;
      if (t <= 0) { clearInterval(this._mole); this.setState({ moleTime:0, moleIdx:-1, cStep:3 }); return; }
      this.setState({ moleTime:t, moleIdx:Math.floor(Math.random() * 12) });
    }, 1000);
  };

  buildCtl = (c) => {
    const v = this.val(c);
    const expert = this.state.mode === 'Expert';
    const raw = /_/.test(c.label) || /^[a-z_]+$/.test(c.label);
    const o = { id:c.id, label:expert ? c.label : (raw ? this.plain(c) : c.label), rawKey:c.id, showKey:expert, kind:c.kind, value:v, unit:c.unit || '', min:c.min, max:c.max, step:c.step, hasInfo:!!c.info, expert:expert,
      onWizard:() => this.openCtlWizard(c),
      onDoc:() => this.showDoc(c),
      onInfo:() => this.showDoc(c),
      onInfoLegacy:() => this.showInfo(c.label, c.info || ('This setting is written to ' + (SCREENS[this.state.screen] || {}).file + ' as ' + c.id + '.'), null),
      set:(nv) => this.setVal(c, nv) };
    if (c.kind === 'segmented' || c.kind === 'select') o.options = (c.options || []).map(x => ({ label:x, on:x === v, off:x !== v, pick:() => this.setVal(c, x) }));
    if (c.kind === 'chips') o.options = (c.options || []).map(x => ({ label:x, on:(v || []).indexOf(x) >= 0, off:(v || []).indexOf(x) < 0, pick:() => this.setVal(c, (v || []).indexOf(x) >= 0 ? v.filter(y => y !== x) : (v || []).concat([x])) }));
    if (c.kind === 'order') {
      o.move = (from, to) => { const a = (v || []).slice(); const [m] = a.splice(from, 1); a.splice(to, 0, m); this.setVal(c, a); };
      o.items = (v || []).map((x, i) => ({ label:x, idx:i, up:() => { const a = v.slice(); if (i > 0) { a[i] = a[i - 1]; a[i - 1] = x; this.setVal(c, a); } }, down:() => { const a = v.slice(); if (i < a.length - 1) { a[i] = a[i + 1]; a[i + 1] = x; this.setVal(c, a); } }, drop:() => this.setVal(c, v.filter(y => y !== x)) }));
      o.pool = (c.pool || []).filter(x => (v || []).indexOf(x) < 0).map(x => ({ label:x, add:() => this.setVal(c, (v || []).concat([x])) }));
    }
    if (c.kind === 'switch') { o.on = !!v; o.off = !v; o.toggle = () => this.setVal(c, !v); }
    if (c.kind === 'stepper') {
      o.dec = () => this.setState(st => { const cur = st.values[c.id] !== undefined ? st.values[c.id] : c.value; return { values:Object.assign({}, st.values, { [c.id]:Math.max(c.min, cur - 1) }) }; });
      o.inc = () => this.setState(st => { const cur = st.values[c.id] !== undefined ? st.values[c.id] : c.value; return { values:Object.assign({}, st.values, { [c.id]:Math.min(c.max, cur + 1) }) }; });
    }
    if (c.kind === 'stepper' || c.kind === 'slider') o.set = (nv) => this.setVal(c, Number(nv));
    if (c.kind === 'slider') { o.onSlide = (e) => this.setVal(c, Number(e.target.value)); o.display = v + (c.unit || ''); o.pct = ((v - c.min) / (c.max - c.min) * 100) + '%'; }
    if (c.kind === 'text') o.display = v;
    if (c.kind === 'file') {
      o.accept = c.accept || '';
      o.fileName = (this.fileControlName ? this.fileControlName(c) : (v || 'No file chosen'));
      o.hasFile = !!(this.fileControlHasFile ? this.fileControlHasFile(c) : v);
      o.onPick = (e) => { const f = e.target && e.target.files && e.target.files[0]; if (f && this.onFilePicked) this.onFilePicked(c, f); };
      o.onClear = () => { if (this.onFileCleared) this.onFileCleared(c); };
    }
    /* Escape hatch for controls whose action is a real side effect (starting a daemon,
     * clearing a local cache) rather than a value the console merely remembers. `c.action`
     * names it; the host component supplies `onControlAction`, and any real value-write
     * `pick`/`toggle` the control already has still runs first, so the console's own commit
     * history keeps recording the choice exactly as it does for every other control. */
    if (c.action && (c.kind === 'segmented' || c.kind === 'select') && o.options) {
      o.options = o.options.map((opt) => Object.assign({}, opt, { pick:() => { opt.pick(); if (this.onControlAction) this.onControlAction(c.action, c, opt.label); } }));
    }
    if (c.action && c.kind === 'text') o.display = (this.controlActionText ? this.controlActionText(c.action, c) : o.display);
    return o;
  };

  v = (id, d) => (this.state.values[id] !== undefined ? this.state.values[id] : d);

  ctlWizard(c) {
    const kindWords = {
      switch:'a switch — it is either on or off, nothing in between',
      segmented:'a set of mutually exclusive choices; exactly one is active',
      select:'a picker; the list is everything this build of Asterisk actually accepts',
      chips:'a multiple choice; tick as many as apply and the order does not matter',
      slider:'a number on a range; the ends are the limits Asterisk itself enforces',
      stepper:'a whole number you raise or lower one step at a time',
      order:'an ordered list — position matters, the top one is tried first',
      text:'the one place a name has to be typed, because a name cannot be guessed'
    };
    const file = (SCREENS[this.state.screen] || {}).file || 'the console profile';
    const cur = this.val(c);
    const shown = Array.isArray(cur) ? (cur.join(', ') || 'nothing') : String(cur);
    const risky = /encrypt|tls|guest|direct_media|force|trust|delete|guard|lock|strict|stir|sign|allow/i.test(c.id + ' ' + c.label);
    return [
      step('What it is', c.label, 'This control is ' + (kindWords[c.kind] || 'a control') + '. It is written to ' + file + ' as ' + c.id + ', and it is set to ' + shown + ' right now.',
        (c.info || 'Nothing else on this screen depends on it, so changing it is safe to try. The previous value is committed to git first, so going back is one click in History.'),
        [c]),
      step('What changes', 'What happens when you change it',
        (c.kind === 'switch'
          ? 'Turning it on takes effect from the next call onwards. Calls already up keep the behaviour they started with — Asterisk does not renegotiate mid-call.'
          : 'The new value applies from the next call onwards. Calls already up are unaffected, because Asterisk reads this at call setup.'),
        (risky
          ? 'This one has real consequences. It changes how much the far end is trusted, or how much of the conversation is protected. Read the warning below before you pick.'
          : 'Low consequence. If it turns out wrong, the worst case is that one endpoint behaves oddly until you change it back.'),
        [c], risky ? 'This setting affects security or trust. The default was chosen deliberately; change it because you know why, not because it is available.' : ''),
      step('What we suggest', 'Our recommendation',
        'Most deployments leave this at its default. The exceptions are worth knowing: a phone behind a home router, a carrier you do not control, or a regulator who has an opinion.',
        'The console never silently picks for you. If you press Apply without touching anything, nothing is written and no commit is made.',
        [c]),
      step('Apply', 'Apply and record',
        'The change is written, committed to the local git repository with a message naming this setting, and then Asterisk is asked to reload only the module that owns it.',
        'If the reload fails validation, the commit is reverted automatically and the console tells you exactly what Asterisk objected to.',
        [ctl('cw_reload', 'After writing', 'segmented', 'Reload the owning module', { options:['Reload the owning module', 'Write only', 'Reload everything'] }),
         ctl('cw_attest', 'Attest this change to memory', 'switch', true)])
    ];
  }

  openCtlWizard = (c) => this.setState({ wizardOpen:true, wizardStep:0, wizardCtl:c });

  wizardPreview() {
    const sc = this.state.screen;
    if (this.state.wizardCtl) {
      const c = this.state.wizardCtl;
      const v = this.val(c);
      const shown = Array.isArray(v) ? v.join(',') : String(v);
      const file = (SCREENS[sc] || {}).file || 'console';
      return '; ' + file + '\n' + c.id + ' = ' + shown + '\n\n; git commit -m "' + c.id + ': ' + shown + '"';
    }
    if (sc === 'servers') {
      const kind = this.v('sv_kind', 'Local');
      const L = ['[profile]', 'type = ' + kind.toLowerCase().replace(/ /g, '-')];
      if (kind !== 'Local') L.push('host = ' + this.v('sv_host', 'pbx-hq.internal'));
      if (kind.indexOf('Docker') >= 0) L.push('container = ' + this.v('sv_container', 'asterisk-prod'));
      if (kind.indexOf('SSH') >= 0) L.push('ssh_user = ' + this.v('sv_user', 'asterisk-ops'), 'ssh_port = ' + this.v('sv_sshport', 22), 'ssh_key = ' + this.v('sv_key', 'id_ed25519 (agent)'), 'strict_host_key = ' + (this.v('sv_hostkey', true) ? 'yes' : 'no'));
      L.push('interface = ' + this.v('sv_iface', 'AMI'), 'manager_port = ' + this.v('sv_amiport', 5038), 'tls = ' + (this.v('sv_tls', true) ? 'yes' : 'no'), 'config_dir = ' + this.v('sv_conf', '/etc/asterisk'));
      return L.join('\n');
    }
    if (sc === 'queues') {
      return '[' + this.v('wq_kind', 'Support').toLowerCase() + ']\nstrategy = ' + this.v('wq_strategy', 'ringall') + '\ntimeout = ' + this.v('wq_timeout', 15) + '\nwrapuptime = ' + this.v('wq_wrapup', 15) + '\nringinuse = ' + (this.v('wq_ringinuse', false) ? 'yes' : 'no') + '\nmusicclass = ' + this.v('wq_moh', 'default') + '\n' + (this.v('wq_members', ['1001', '1002', '1004'])).map(m => 'member => PJSIP/' + m).join('\n');
    }
    if (WIZARDS[sc] === WIZARDS.endpoints || sc === 'endpoints') {
      return '[' + this.v('w_name', '1005') + ']\ntype = endpoint\ntransport = ' + this.v('w_transport', 'transport-tls') + '\ncontext = ' + this.v('w_context', 'from-internal') + '\nallow = ' + this.v('w_codecs', ['opus', 'g722', 'ulaw']).join(',') + '\nmedia_encryption = ' + (this.v('w_encrypt', true) ? 'sdes' : 'no') + '\ndirect_media = ' + (this.v('w_direct', false) ? 'yes' : 'no') + '\ndtmf_mode = ' + this.v('w_dtmf', 'rfc4733') + '\n\n[' + this.v('w_name', '1005') + ']\ntype = aor\nmax_contacts = ' + this.v('w_maxcontacts', 1) + '\nqualify_frequency = ' + this.v('w_qualify', 60);
    }
    return '; goal = ' + this.v('wd_goal', 'Recommended defaults') + '\n; scope = ' + this.v('wd_scope', 'This object') + '\n; strictness = ' + this.v('wd_level', 3) + '/5';
  }

  renderVals() {
    const s = this.state;
    const sc = SCREENS[s.screen];
    const railDef = RAIL.find(r => r.id === s.railId) || RAIL[0];
    const secIds = ORDER.filter(k => SCREENS[k].rail === s.railId);
    const node = NODES.find(n => n.id === s.nodeId) || NODES[0];
    const ob = ONBOARD[s.onboardStep];
    const cliCmd = s.cli.verb + ' ' + s.cli.obj + ' ' + s.cli.target;
    const flow = s.wizardCtl ? this.ctlWizard(s.wizardCtl) : (WIZARDS[s.screen] || WIZARDS._default);
    const wStep = Math.min(s.wizardStep, flow.length - 1);
    const cur = flow[wStep];
    const last = wStep === flow.length - 1;
    const wizStep = wStep;
    const gk = (GAMES.find(g => g.id === s.game) || GAMES[0]).kind;
    const sel = s.selected || [];

    const tbl = sc.table || { cols:[], rows:[], grid:'1fr', add:'Add' };
    const chipOK = { 'Reachable':1, 'Registered':1, 'Running':1, 'Up':1, 'Active':1, 'Connected':1, 'Signed':1, 'Enabled':1, 'Published':1, 'Sealed':1, 'Locked':1, 'Playable':1 };

    return {
      // Each of the seven menus opens the same context-menu overlay everything else on this
      // screen already uses, keyed by which label was clicked (ctxItems' 'menubar' branch,
      // below) -- rather than a toast that announced a menu and never opened one.
      menus:['File','Edit','View','PBX','Agent','Window','Help'].map(l => ({ label:l, open:(e) => { if (e && e.preventDefault) e.preventDefault(); this.setState({ ctxOpen:true, ctxKind:'menubar', ctxMenuId:l, ctxTarget:l, ctxSub:'', ctxX:(e ? e.clientX : 12) + 'px', ctxY:'46px' }); } })),
      connLabel:'pbx-hq · AMI 5038', connUptime:'up 14d 06:22',
      openConnection:() => this.showInfo('Connection', 'The console is attached to pbx-hq over the manager interface on port 5038, secured with TLS. Losing this connection makes every live number on the dashboard grey out — configuration screens keep working from the last read.', 'The app is talking to your phone system over the network. If the little dot stops being green, the two are no longer talking.', '38%', '70px'),
      modeOpts:['Beginner','Expert'].map(m => ({ label:m, on:s.mode === m, off:s.mode !== m, pick:() => this.setState({ mode:m }) })),
      togglePalette:() => this.set('paletteOpen', !s.paletteOpen),
      startOnboarding:() => this.setState({ onboardOpen:true, onboardStep:0 }),

      rail:RAIL.map(r => ({ icon:r.icon, label:r.label, on:r.id === s.railId, off:r.id !== s.railId, pick:() => this.setState({ railId:r.id, screen:ORDER.find(k => SCREENS[k].rail === r.id) }) })),
      groupLabel:railDef.groupLabel, groupDesc:railDef.groupDesc,
      sections:secIds.map(k => ({ label:SCREENS[k].label, icon:SCREENS[k].icon, badge:SCREENS[k].badge, on:k === s.screen, off:k !== s.screen, pick:() => this.openScreen(k) })),
      dirtyLabel:'all changes applied',

      screenKey:s.screen + ':' + s.railId + ':' + s.mode,
      beginner:s.mode === 'Beginner', expertMode:s.mode === 'Expert',
      expertLine:'edits ' + (sc.file || 'the console profile') + ' · branch ' + s.branch + ' · commit on write ' + (this.v('hi_commit', true) ? 'on' : 'off'),
      expertCount:(() => { let n = 0; (sc.groups || []).forEach(g => { n += g.ctls.length; }); return n + ' options'; })(),
      hiddenCount:(() => { let n = 0; (sc.groups || []).forEach(g => g.ctls.forEach(x => { if (ADVANCED.indexOf(x.id) >= 0) n++; })); return n + ' advanced options are hidden'; })(),
      beginnerNote:(() => {
        const notes = { servers:'You do not need to understand any of this. Press the big green button and answer nothing.', endpoints:'An endpoint is one phone. Adding one is a five-question wizard.', queues:'A queue is a waiting line for callers. The only choice that matters is who gets rung first.', canvas:'Each box is one thing that happens to a call, in order, top to bottom.', security:'The defaults here are already safe. Only change something if you know why.' };
        return notes[s.screen] || 'Everything on this screen has an explain button and its own step-by-step wizard. Nothing is written until you confirm.';
      })(),
      screenTitle:sc.title, screenFile:sc.file, screenSub:sc.sub,
      openInfoScreen:() => this.showInfo(sc.title, sc.sub, 'This screen edits ' + (sc.file || 'the console itself') + '. Every row you see is a real object in the running system, and every control writes one option.', '46%', '150px'),
      openWizard:() => (sc.kind === 'servers' && this.onAddServer ? this.onAddServer()
        : (s.screen === 'security' && this.onAddAclRule ? this.onAddAclRule()
        : (s.screen === 'sounds' && this.onAddPromptRow ? this.onAddPromptRow()
        : this.setState({ wizardOpen:true, wizardStep:0, wizardCtl:null })))),

      isDashboard:sc.kind === 'dashboard', isCanvas:sc.kind === 'canvas', isTable:sc.kind === 'table', isCli:sc.kind === 'cli', isMemory:sc.kind === 'memory', isDocs:sc.kind === 'docs', isChangelog:sc.kind === 'changelog',
      // Additive, not kind-exclusive: codecs (kind:'generic') and endpoints (kind:'table')
      // keep their own screen, this just adds a graph panel on top of it.
      isCodecGraph:s.screen === 'codecs', isEndpointGraph:s.screen === 'endpoints',
      /* The servers screen has its own hero (One Click Setup) above this, but its
       * configured connections are a real table too, so it shares the generic table
       * markup — search, filters, the add button, and every row's own context menu. */
      isTableLike:sc.kind === 'table' || sc.kind === 'servers',

      stats:[
        { icon:'call', label:'Active calls', value:'4', delta:'peak today 19' },
        { icon:'smartphone', label:'Endpoints up', value:'11/12', delta:'1003 unreachable' },
        { icon:'groups', label:'Queue waiting', value:'3', delta:'longest 01:12' },
        { icon:'speed', label:'Answer rate', value:'92%', delta:'service level 60s' }
      ].map((k, i) => Object.assign({}, k, { rnd:this.rnd(40 + i) })),
      liveCalls:[
        { chan:'PJSIP/1001-0000a1', peer:'Ada Deng', dur:'00:04:12', codec:'opus' },
        { chan:'PJSIP/1004-0000a2', peer:'support queue', dur:'00:01:47', codec:'g722' },
        { chan:'PJSIP/trunk-0000a3', peer:'+1 415 555 0148', dur:'00:12:03', codec:'ulaw' },
        { chan:'IAX2/branch-0000a4', peer:'branch-office', dur:'01:22:58', codec:'g722' }
      ].map(c => Object.assign({}, c, {
        spy:() => this.ceremony('Listen to a live call', 'channel spy ' + c.chan),
        rec:() => this.ceremony('Start recording a live call', 'mixmonitor start ' + c.chan),
        kill:() => this.ceremony('Hang up a live call', 'channel request hangup ' + c.chan)
      })),
      health:[
        { label:'CPU', value:'18%', pct:'18%' },
        { label:'Memory', value:'1.4 / 8 GB', pct:'17%' },
        { label:'SIP registrations', value:'11 of 12', pct:'92%' },
        { label:'Trunk capacity', value:'4 of 60', pct:'7%' }
      ],
      quickActions:QUICK_ACTIONS.map(q => Object.assign({}, q, { run:() => this.ceremony(q.label, q.cmd) })),

      canvasTools:[
        { icon:'near_me', label:'Select', id:'select' }, { icon:'timeline', label:'Wire', id:'wire' },
        { icon:'pan_tool', label:'Pan', id:'pan' }, { icon:'crop_free', label:'Marquee', id:'marquee' },
        { icon:'content_cut', label:'Split', id:'split' }, { icon:'comment', label:'Comment', id:'comment' },
        { icon:'straighten', label:'Measure', id:'measure' }
      ].map(t => ({ icon:t.icon, label:t.label, on:s.canvasTool === t.id, off:s.canvasTool !== t.id, pick:() => { this.set('canvasTool', t.id); this.toast(t.label + ' tool active'); } })),
      canvasToggles:[
        { icon:'grid_on', label:'Grid', k:'grid' }, { icon:'grid_goldenratio', label:'Snap', k:'snap' },
        { icon:'straighten', label:'Guides', k:'guides' }, { icon:'map', label:'Minimap', k:'minimap' }
      ].map(t => ({ icon:t.icon, label:t.label, on:!!s[t.k], off:!s[t.k], pick:() => this.set(t.k, !s[t.k]) })),
      canvasLayers:['Dialplan', 'IVR', 'Queues', 'Annotations'].map(l => ({ label:l, on:s.layer === l, off:s.layer !== l, pick:() => this.set('layer', l) })),
      zoomLabel:s.zoom + '%',
      zoomIn:() => this.set('zoom', Math.min(200, s.zoom + 10)),
      zoomOut:() => this.set('zoom', Math.max(40, s.zoom - 10)),
      canvasBgClick:() => {},
      /* A removed step takes its connections with it, which is what the confirmation
         promises. Filtering only the nodes would leave lines running to nothing. */
      edges:s.edgeList.filter(([a, b]) => (s.removedNodes || []).indexOf(a) < 0 && (s.removedNodes || []).indexOf(b) < 0).map(([a, b]) => {
        const An = NODES.find(n => n.id === a), Bn = NODES.find(n => n.id === b);
        if (!An || !Bn) return { d:'', stroke:'transparent', w:0 };
        const Ap = s.nodePos[a] || An, Bp = s.nodePos[b] || Bn;
        const A = { x:Ap.x, y:Ap.y }, B = { x:Bp.x, y:Bp.y };
        const sel = s.nodeId === a || s.nodeId === b;
        let x1, y1, x2, y2, d;
        if (B.x > A.x + 40) {
          x1 = A.x + NW; y1 = A.y + NH / 2; x2 = B.x; y2 = B.y + NH / 2;
          const m = (x1 + x2) / 2;
          d = 'M' + x1 + ' ' + y1 + ' C' + m + ' ' + y1 + ' ' + m + ' ' + y2 + ' ' + x2 + ' ' + y2;
        } else {
          x1 = A.x + NW / 2; y1 = A.y + NH; x2 = B.x + NW / 2; y2 = B.y;
          const m = (y1 + y2) / 2;
          d = 'M' + x1 + ' ' + y1 + ' C' + x1 + ' ' + m + ' ' + x2 + ' ' + m + ' ' + x2 + ' ' + y2;
        }
        return { d, stroke:sel ? '#82D9A5' : '#37483D', w:sel ? 2.5 : 1.8 };
      }),
      nodes:NODES.concat(s.addedNodes || []).filter(n => (s.removedNodes || []).indexOf(n.id) < 0).map(n => {
        const p = s.nodePos[n.id] || { x:n.x, y:n.y };
        const on = n.id === s.nodeId;
        return { x:p.x + 'px', y:p.y + 'px', icon:n.icon, title:n.title, detail:n.detail,
          border:on ? '#82D9A5' : '#333B34', selected:on, unselected:!on,
          pick:() => this.set('nodeId', n.id),
          onDragStart:(e) => { const r = e.currentTarget.getBoundingClientRect(); this.setState({ nodeId:n.id, nodeDrag:{ id:n.id, dx:e.clientX - r.left, dy:e.clientY - r.top } }); },
          onDragEnd:() => this.set('nodeDrag', null),
          nudge:(dx, dy) => this.moveNode(n.id, dx, dy),
          left:() => this.moveNode(n.id, -20, 0), right:() => this.moveNode(n.id, 20, 0),
          up:() => this.moveNode(n.id, 0, -20), down:() => this.moveNode(n.id, 0, 20),
          connect:() => this.addEdgeFrom(),
          ctx:(e) => { e.preventDefault(); this.setState({ nodeId:n.id, ctxOpen:true, ctxX:e.clientX + 'px', ctxY:e.clientY + 'px', ctxTarget:n.title, ctxKind:'node' }); },
          // Same mechanism as the right-click "Duplicate step" a few hundred lines down
          // (addedNodes + nodeSeq): this card's own duplicate button used to just say the
          // word "duplicated" and add nothing to addedNodes at all.
          dup:() => { const seq = (s.nodeSeq || 0) + 1; const copy = Object.assign({}, n, { id:'added-' + seq, title:n.title + ' (copy)', x:p.x + 40, y:p.y + 40 }); this.setState({ addedNodes:(s.addedNodes || []).concat([copy]), nodeSeq:seq, nodeId:copy.id }); this.fire('Step duplicated', copy.title + ' is on the canvas, offset from the original.'); },
          del:() => this.areYouSure('Delete ' + n.title, 'The step and every connection into or out of it are removed from the dialplan.', 3, () => { const gone = (s.removedNodes || []).concat([n.id]); this.setState({ removedNodes:gone }); this.fire('Step deleted', n.title + ' is off the canvas, with its connections.'); }) };
      }),
      canvasDrop:(e) => {
        e.preventDefault();
        const d = s.nodeDrag; if (!d) return;
        const r = e.currentTarget.getBoundingClientRect();
        const pos = Object.assign({}, s.nodePos);
        pos[d.id] = { x:Math.max(0, Math.round(e.clientX - r.left - d.dx)), y:Math.max(0, Math.round(e.clientY - r.top - d.dy)) };
        this.setState({ nodePos:pos, nodeDrag:null });
      },
      canvasDragOver:(e) => e.preventDefault(),
      canvasOps:[
        { icon:'auto_awesome_mosaic', label:'Auto-arrange', run:() => { this.setState({ nodePos:{} }); this.toast('Steps arranged left to right by call order'); } },
        { icon:'align_horizontal_left', label:'Align left', run:() => { const p = {}; NODES.forEach(n => { p[n.id] = { x:40, y:(s.nodePos[n.id] || n).y }; }); this.setState({ nodePos:p }); } },
        { icon:'vertical_distribute', label:'Distribute', run:() => { const p = {}; NODES.forEach((n, i) => { p[n.id] = { x:(s.nodePos[n.id] || n).x, y:20 + i * 66 }; }); this.setState({ nodePos:p }); } },
        { icon:'fit_screen', label:'Fit to view', run:() => { this.set('zoom', 100); this.toast('Zoom reset and canvas centred'); } },
        { icon:'undo', label:'Undo layout', run:() => { this.setState({ nodePos:{} }); this.toast('Layout reverted'); } }
      ],
      edgeRows:s.edgeList.map((e, i) => ({
        from:NODES.find(n => n.id === e[0]).title, to:NODES.find(n => n.id === e[1]).title,
        fromOpts:NODES.map(n => ({ label:n.title, on:n.id === e[0], off:n.id !== e[0], pick:() => { const L = s.edgeList.map(x => x.slice()); L[i][0] = n.id; this.setState({ edgeList:L }); } })),
        toOpts:NODES.map(n => ({ label:n.title, on:n.id === e[1], off:n.id !== e[1], pick:() => { const L = s.edgeList.map(x => x.slice()); L[i][1] = n.id; this.setState({ edgeList:L }); } })),
        del:() => this.setState({ edgeList:s.edgeList.filter((_, j) => j !== i) })
      })),
      addEdge:() => this.setState({ edgeList:s.edgeList.concat([['n1', 'n2']]) }),
      fullscreen:s.fullscreen,
      canvasPosition:s.fullscreen ? 'fixed' : 'static',
      canvasInset:s.fullscreen ? '0' : 'auto',
      canvasZ:s.fullscreen ? 94 : 'auto',
      toggleFullscreen:() => { this.set('fullscreen', !s.fullscreen); this.toast(s.fullscreen ? 'Editor restored' : 'Full-screen editor — press the button again or Esc to exit'); },
      fsIcon:s.fullscreen ? 'fullscreen_exit' : 'fullscreen',
      // Placed offset from whatever step is currently selected -- the same addedNodes +
      // nodeSeq mechanism "Insert condition before" already uses -- rather than a toast
      // that named a step and put nothing on the canvas.
      paletteNodes:[
        { icon:'add_call', label:'Dial' }, { icon:'dialpad', label:'Menu' }, { icon:'groups', label:'Queue' }, { icon:'call_split', label:'Condition' }, { icon:'voicemail', label:'Voicemail' }
      ].map(p => ({ icon:p.icon, label:p.label, add:() => {
        const at = NODES.concat(s.addedNodes || []).filter(n => n.id === s.nodeId)[0];
        const seq = (s.nodeSeq || 0) + 1;
        const node = { id:'added-' + seq, x:(at ? at.x + 40 : 40), y:(at ? at.y + 40 : 40), icon:p.icon, title:p.label, detail:p.label + ' — configure this step' };
        this.setState({ addedNodes:(s.addedNodes || []).concat([node]), nodeSeq:seq, nodeId:node.id });
        this.fire(p.label + ' step added', node.title + ' is on the canvas, ready to wire in.');
      } })),
      nodeTitle:node.title, nodeApp:node.detail.split('\n')[0],
      nodeCtls:(NODE_CTLS[node.id] || []).map(c => Object.assign(this.buildCtl(c), { narrow:true })),

      tableCols:tbl.cols, tableGrid:tbl.grid, tableAddLabel:tbl.add,
      tableFilters:['All','Healthy','Attention'].map(f => ({ label:f, on:s.tableFilter === f, off:s.tableFilter !== f, pick:() => this.set('tableFilter', f) })),
      hasSelection:sel.length > 0,
      selectionLabel:sel.length + ' of ' + tbl.rows.length + ' selected',
      allBorder:sel.length ? '#82D9A5' : '#8B938C', allBg:sel.length ? '#82D9A5' : 'transparent',
      allIcon:sel.length === tbl.rows.length && tbl.rows.length ? 'check' : (sel.length ? 'remove' : ''),
      toggleAll:() => this.set('selected', sel.length === tbl.rows.length ? [] : tbl.rows.map(r => r[0])),
      clearSelection:() => this.set('selected', []),
      bulkActions:[
        { icon:'play_arrow', label:'Enable', run:() => this.bulk('Enabled', sel) },
        { icon:'pause', label:'Disable', run:() => this.bulk('Disabled', sel) },
        { icon:'refresh', label:'Reload', run:() => this.ceremony('Reload ' + sel.length + ' objects', 'reload ' + sel.join(' ')) },
        { icon:'edit', label:'Edit together', run:() => this.setState({ wizardOpen:true, wizardStep:0 }) },
        { icon:'content_copy', label:'Duplicate', run:() => this.bulk('Duplicated', sel) },
        { icon:'lock', label:'Lock each', run:() => { this.setState({ lockOpen:true, lockTarget:sel.length + ' selected objects', lockKey:this.state.screen, lockStep:0, lockX:'38%', lockY:'18%' }); } },
        { icon:'download', label:'Export', run:() => { this.setState({ selected:[] }); this.hostAction('export-json', { subject:'selection', name:'selection', data:sel }); } },
        { icon:'delete', label:'Delete', run:() => this.ceremony('Delete ' + sel.length + ' objects', 'delete ' + sel.join(' ')) }
      ],
      tableRows:tbl.rows.map(r => ({
        // This announced that the row had been loaded into the editor below and loaded
        // nothing at all — a toast asserting something that had not happened. A screen
        // that can really load a row supplies its own handler; the rest say plainly that
        // they cannot rather than claiming they did.
        pick:() => { if (this.onPickRow) { this.onPickRow(r[0]); return; }
          this.toast(r[0] + ' cannot be loaded into the editor on this screen yet'); },
        rnd:this.rnd(80 + tbl.rows.indexOf(r)),
        bg:sel.indexOf(r[0]) >= 0 ? '#1D2A22' : 'transparent',
        border:sel.indexOf(r[0]) >= 0 ? '#82D9A5' : '#8B938C',
        checkBg:sel.indexOf(r[0]) >= 0 ? '#82D9A5' : 'transparent',
        checkIcon:sel.indexOf(r[0]) >= 0 ? 'check' : '',
        toggle:() => this.set('selected', sel.indexOf(r[0]) >= 0 ? sel.filter(x => x !== r[0]) : sel.concat([r[0]])),
        ctx:(e) => { e.preventDefault(); this.setState({ ctxOpen:true, ctxX:e.clientX + 'px', ctxY:e.clientY + 'px', ctxTarget:r[0], ctxKind:'row' }); },
        cells:r.map((cell, i) => {
          const last = i === r.length - 1 && tbl.cols.length > 3;
          const ok = chipOK[cell];
          return { text:cell, isChip:last, isMono:!last && i === 0, isText:!last && i !== 0, bg:ok ? '#1B4D33' : '#5C1B18', fg:ok ? '#9FF7C4' : '#FFB4AB' };
        })
      })),

      cliSteps:CLI_STEPS.map(st => ({
        label:st.label,
        info:() => this.showInfo(st.label, 'This part of the command chooses ' + st.label.toLowerCase() + '. The console only ever offers combinations that exist in this build of Asterisk, so an invalid command cannot be assembled.', 'Think of it like ordering food from pictures instead of writing the order down. You cannot misspell anything.'),
        options:st.options.map(o => ({ label:o, on:s.cli[st.id] === o, off:s.cli[st.id] !== o, pick:() => this.setState({ cli:Object.assign({}, s.cli, { [st.id]:o }) }) }))
      })),
      cliCommand:'asterisk -rx "' + cliCmd + '"',
      cliExplain:'Asks the running PBX to list every ' + s.cli.target + ' it currently knows about. Read-only, but it still passes through confirmation because it touches production.',
      runCli:() => this.ceremony('Run a CLI command', cliCmd),
      cliLog:[
        { text:'pbx-hq*CLI> pjsip show endpoints', color:'#9FF7C4' },
        { text:' Endpoint:  1001/1001                    Not in use    0 of inf', color:'#C4CBC2' },
        { text:'    InAuth:  1001/1001', color:'#778078' },
        { text:'       Aor:  1001                                        2', color:'#778078' },
        { text:'  Contact:  1001/sip:1001@10.20.4.31:5060  Avail  22.418', color:'#82D9A5' },
        { text:' Endpoint:  1003/1003                    Unavailable   0 of inf', color:'#FFB4AB' },
        { text:'  Contact:  1003/sip:1003@10.20.4.44:5060  Unavail  0.000', color:'#FFB4AB' },
        { text:' Endpoint:  1004/1004                    In use        1 of inf', color:'#C4CBC2' },
        { text:'', color:'#778078' },
        { text:'Objects found: 12', color:'#9AA39B' }
      ],

      regexValue:s.regex.join(''),
      regexMatches:'184 matches',
      regexTokens:s.regex.map((t, i) => ({ label:t, remove:() => this.set('regex', s.regex.filter((_, j) => j !== i)) })),
      regexPalette:['^', '$', '\\d+', '[a-z]+', '.*', '\\.md$', '(a|b)'].map(p => ({ label:p, add:() => this.set('regex', s.regex.concat([p])) })),
      memRows:[
        { scope:'projects', text:'conservation-bakery — desktop app, Windows first', when:'2d' },
        { scope:'projects', text:'material-virtualbox — native Qt, Squirrel rule does not reach', when:'4d' },
        { scope:'extensions', text:'status-protocol — session and reply contract', when:'6d' },
        { scope:'shared', text:'Every countable vocabulary noun takes a final s', when:'8d' },
        { scope:'host', text:'HOST_INVENTORY — pbx-hq, pbx-branch, builder', when:'11d' }
      ],
      memPanels:[
        { icon:'sync', title:'Sync', action:'Run sync now', rows:[{ k:'Last run', v:'08:14' }, { k:'Records', v:'2,412' }, { k:'Drift', v:'none' }], act:() => this.ceremony('Run a memory sync', 'sync-agent-memory --attest') },
        { icon:'verified_user', title:'Attestation', action:'Re-attest', rows:[{ k:'State', v:'Signed' }, { k:'Backup', v:'verified' }, { k:'Chain', v:'unbroken' }], act:() => this.ceremony('Re-attest the memory ledger', 'attest --rebuild') },
        // Its two siblings above both gate the real administrative action behind the same
        // ceremony confirmation flow and then report what actually ran. This one used to
        // skip straight to a toast claiming a scan had been queued -- nothing was ever
        // queued, and it was the one panel out of three that did not match its neighbours.
        { icon:'policy', title:'Emission guard', action:'Scan surfaces', rows:[{ k:'Mode', v:'Block' }, { k:'Violations', v:'0' }, { k:'Lock', v:'engaged' }], act:() => this.ceremony('Scan for vocabulary emissions', 'leak-scan --scan') }
      ],

      docsQuery:'',
      setDocsQuery:(e) => this.set('docsQuery', e.target.value),
      docsRegexOn:false,
      toggleDocsRegex:() => this.set('docsRegexOn', !s.docsRegexOn),
      docsRegexBg:s.docsRegexOn ? '#005230' : 'transparent',
      docsRegexColor:s.docsRegexOn ? '#9FF7C4' : '#778078',
      docsRegexPalette:['^', '$', '\d+', '[a-z]+', '.*', '\.md$'].map(p => ({ label:p, add:() => this.set('docsQuery', (s.docsQuery || '') + p) })),
      docsQueryError:'',
      docsResultsLabel:'12 articles',
      docsCategories:[{ name:'platform', count:12 }, { name:'security', count:6 }],
      docsResults:[
        { id:'platform/overview', category:'platform', title:'Overview', excerpt:'What this console is and how it reads a PBX.', bg:'transparent', select:() => this.set('docsSelectedId', 'platform/overview') }
      ],
      docsSelectedTitle:'Overview',
      docsSelectedCategory:'platform',
      docsBlocks:[{ isParagraph:true, spans:[{ isPlain:true, text:'Select an article to read it here.' }] }],
      docsOutline:[],
      docsHasSuggested:false,
      docsSuggested:[],

      codecGraphHasData:true,
      codecGraphStatus:'6 codecs - 9 translation paths',
      codecGraphNodes:[
        { id:'opus', label:'opus', x:'274px', y:'26px', fill:'#82D9A5' },
        { id:'ulaw', label:'ulaw', x:'380px', y:'150px', fill:'#82D9A5' },
        { id:'g729', label:'g729', x:'274px', y:'274px', fill:'#FFB4AB' }
      ],
      codecGraphEdges:[
        { d:'M310 62 L380 150' },
        { d:'M380 150 L310 238' }
      ],
      codecGraphUnreachableLabel:'',

      endpointGraphHasData:true,
      endpointGraphStatus:'12 endpoints - 11 reachable - 1 broken',
      endpointGraphWidth:'948px',
      endpointGraphHeight:'214px',
      endpointGraphNodes:[
        { id:'1001', label:'1001', detail:'Not in use', x:'20px', y:'26px', fill:'#82D9A5' },
        { id:'aor:1001', label:'1001', detail:'Configured address-of-record', x:'210px', y:'26px', fill:'#9AA39B' },
        { id:'contact:1001', label:'sip:1001@10.20.4.31', detail:'Live contact, OK', x:'400px', y:'26px', fill:'#7FD1F0' }
      ],
      endpointGraphEdges:[{ d:'M104 38 C157 38 157 38 210 38' }, { d:'M294 38 C347 38 347 38 400 38' }],
      endpointGraphBroken:['Address-of-record 1003 has a contact, but it is not reachable.'],

      changelogQuery:'',
      setChangelogQuery:(e) => this.set('changelogQuery', e.target.value),
      changelogRegexOn:false,
      toggleChangelogRegex:() => this.set('changelogRegexOn', !s.changelogRegexOn),
      changelogRegexBg:s.changelogRegexOn ? '#005230' : 'transparent',
      changelogRegexColor:s.changelogRegexOn ? '#9FF7C4' : '#778078',
      changelogRegexPalette:['^', '$', '\d+', '[a-z]+', '.*', 'fix'].map(p => ({ label:p, add:() => this.set('changelogQuery', (s.changelogQuery || '') + p) })),
      changelogQueryError:'',
      changelogFrom:'',
      setChangelogFrom:(e) => this.set('changelogFrom', e.target.value),
      changelogTo:'',
      setChangelogTo:(e) => this.set('changelogTo', e.target.value),
      changelogDateError:'',
      changelogPresets:[
        { label:'All time', apply:() => this.setState({ changelogFrom:'', changelogTo:'' }) },
        { label:'Last 30 days', apply:() => this.applyChangelogPreset(30) },
        { label:'Last 90 days', apply:() => this.applyChangelogPreset(90) },
        { label:'This year', apply:() => this.applyChangelogYear() }
      ],
      changelogResultsLabel:'0 versions',
      changelogRangeLabel:'',
      changelogEntries:[
        { version:'0.1.0', date:'2026-08-23', changes:[{ category:'General', summary:'Select a version to read its changes here.', commitShort:'', commitUrl:'' }] }
      ],
      changelogCopy:() => this.copyChangelog(),
      changelogExport:() => this.exportChangelog(),

      groups:(sc.groups || []).map((g, gi) => ({
        rnd:this.rnd(gi + 1),
        title:g.title, desc:g.desc,
        wizard:() => this.setState({ wizardOpen:true, wizardStep:0 }),
        ctls:g.ctls.filter(c => !(s.mode === 'Beginner' && (c.expertOnly || ADVANCED.indexOf(c.id) >= 0)))
          // A control that only means something once another control has a particular
          // value. Without this, picking an option that needs a value has nowhere to put
          // it: choosing a custom hold source offered no field to name the source, so the
          // choice could be made and never completed.
          .filter(c => !c.showWhen || this.val(g.ctls.find(x => x.id === c.showWhen.control) || { id:c.showWhen.control }) === c.showWhen.is)
          .map(x => { const b = this.buildCtl(x); if (x.kind === 'segmented' && (x.options || []).length > 2) b.narrow = true; return b; })
      })),

      tabGroups:s.groups.map(g => ({
        name:g.name, colour:g.colour, count:g.tabs.length + '', bg:'#141A15',
        chevron:g.collapsed ? 'chevron_right' : 'expand_more',
        toggle:() => this.setState({ groups:s.groups.map(x => x.id === g.id ? Object.assign({}, x, { collapsed:!x.collapsed }) : x) }),
        ctx:(e) => { e.preventDefault(); this.setState({ ctxOpen:true, ctxSub:'', ctxGroupId:g.id, ctxX:e.clientX + 'px', ctxY:e.clientY + 'px', ctxTarget:'group · ' + g.name, ctxKind:'group' }); }
      })),
      renameOpen:s.renameOpen, renameValue:s.renameValue,
      onRename:(e) => this.set('renameValue', e.target.value),
      saveRename:() => {
        const key = s.renameKey || '';
        if (key.indexOf('group:') === 0) {
          const id = key.slice(6);
          this.setState(st => ({ groups:st.groups.map(g => g.id === id ? Object.assign({}, g, { name:st.renameValue }) : g), renameOpen:false }));
          return this.toast('Group renamed');
        }
        this.setState(st => ({ tabNames:Object.assign({}, st.tabNames, { [key]:st.renameValue }), renameOpen:false }));
        this.toast('Tab renamed');
      },
      cancelRename:() => this.set('renameOpen', false),
      tabColourOpen:s.tabColourOpen,
      tabColourOpts:['#82D9A5', '#FFD68A', '#FFB4AB', '#8AB4F8', '#D8A9F0', '#DFE4DC'].map(c => ({ colour:c, border:s.tabColours[s.renameKey] === c ? '#DFE4DC' : 'transparent', pick:() => this.applyColour(c) })),
      cpickValue:'hsl(' + this.v('cp_hue', 148) + ' ' + this.v('cp_sat', 60) + '% ' + this.v('cp_light', 62) + '%)',
      cpickAnim:this.v('cp_rainbow', false) ? ('m3Rainbow ' + this.v('cp_speed', 6) + 's ' + (this.v('cp_ease', 'linear') === 'steps' ? 'steps(12)' : this.v('cp_ease', 'linear')) + ' infinite ' + (this.v('cp_dir', 'Forward') === 'Reverse' ? 'reverse' : (this.v('cp_dir', 'Forward') === 'Ping-pong' ? 'alternate' : 'normal'))) : 'none',
      cpickHues:Array.from({ length:24 }, (_, i) => { const h = Math.round(i * 15); return { colour:'hsl(' + h + ' 70% 55%)', label:h + '°', pick:() => this.setVal({ id:'cp_hue', label:'Hue' }, h) }; }),
      cpickShades:Array.from({ length:14 }, (_, i) => { const l = 8 + i * 6.4; return { colour:'hsl(' + this.v('cp_hue', 148) + ' ' + this.v('cp_sat', 60) + '% ' + Math.round(l) + '%)', pick:() => this.setVal({ id:'cp_light', label:'Lightness' }, Math.round(l)) }; }),
      cpickCtls:[
        ctl('cp_hue', 'Hue', 'slider', 148, { min:0, max:360, unit:'°' }),
        ctl('cp_sat', 'Saturation', 'slider', 60, { min:0, max:100, unit:'%' }),
        ctl('cp_light', 'Lightness', 'slider', 62, { min:0, max:100, unit:'%' }),
        ctl('cp_rainbow', 'Rainbow', 'switch', false, { info:'Cycles this colour through the whole hue wheel. The speed, range, easing and direction below control how.' }),
        ctl('cp_speed', 'Cycle speed', 'slider', 6, { min:0.5, max:30, step:0.5, unit:'s per loop' }),
        ctl('cp_ease', 'Easing', 'segmented', 'linear', { options:['linear', 'ease-in-out', 'steps'] }),
        ctl('cp_dir', 'Direction', 'segmented', 'Forward', { options:['Forward', 'Reverse', 'Ping-pong'] })
      ].map(this.buildCtl),
      cpickFormats:(() => { const h = this.v('cp_hue', 148), sa = this.v('cp_sat', 60), l = this.v('cp_light', 62);
        // Real clipboard write through the same hostAction('copy', ...) route as every
        // other copy control on this screen, rather than a toast that claimed a value was
        // on the clipboard when nothing had touched it.
        return [['hsl', 'hsl(' + h + ' ' + sa + '% ' + l + '%)'], ['oklch', 'oklch(' + (l / 100).toFixed(2) + ' 0.13 ' + h + ')'], ['hsl deg', h + 'deg'], ['css var', '--tab-accent']].map(([k, v2]) => ({ label:k + ' · ' + v2, copy:() => this.hostAction('copy', { what:k, text:v2 }) })); })(),
      cpickIsGroup:(s.renameKey || '').indexOf('group:') === 0,
      cpickLabel:(s.renameKey || '').indexOf('group:') === 0 ? 'Group colour' : 'Tab colour',
      cpickApply:() => this.applyColour(this.v('cp_rainbow', false) ? 'rainbow' : 'hsl(' + this.v('cp_hue', 148) + ' ' + this.v('cp_sat', 60) + '% ' + this.v('cp_light', 62) + '%)'),
      hasUsedColours:Object.keys(s.tabColours).length > 0,
      usedColours:(() => {
        const by = {};
        Object.keys(s.tabColours).forEach(k => { const c = s.tabColours[k]; (by[c] = by[c] || []).push(s.tabNames[k] || (SCREENS[k] ? SCREENS[k].title : k)); });
        return Object.keys(by).map(c => ({ colour:c, tabs:by[c].join(', '), pick:() => this.applyColour(c) }));
      })(),
      tabFilterOpen:s.tabFilterOpen,
      tabFilterTitle:s.tabFilterMode === 'not' ? 'Close tabs NOT containing…' : (s.tabFilterMode === 'colour' ? 'Close tabs by colour' : 'Close tabs containing…'),
      tabFilterIsColour:s.tabFilterMode === 'colour',
      tabFilterIsText:s.tabFilterMode !== 'colour',
      tabFilterColours:(() => {
        const by = {};
        s.tabs.forEach(t => { const c = s.tabColours[t] || 'none'; (by[c] = by[c] || []).push(s.tabNames[t] || (SCREENS[t] ? SCREENS[t].title : t)); });
        return Object.keys(by).map(c => ({
          colour:c === 'none' ? '#414942' : c,
          label:c === 'none' ? 'No colour' : c,
          tabs:by[c].join(', '), count:by[c].length + ' tab' + (by[c].length === 1 ? '' : 's'),
          on:s.tabFilterColour === c,
          border:s.tabFilterColour === c ? '#DFE4DC' : 'transparent',
          pick:() => this.set('tabFilterColour', c)
        }));
      })(),
      tabFilterText:s.tabFilterText,
      tabFilterApply:s.tabFilterMode === 'not' ? 'Close non-matching' : (s.tabFilterMode === 'colour' ? 'Close this colour' : 'Close matching'),
      onTabFilterText:(e) => this.set('tabFilterText', e.target.value),
      openTabRegex:() => this.setState({ regexOpen:true, regexTarget:'nav', regexX:'34%', regexY:'150px' }),
      tabFilterPreview:(() => {
        if (s.tabFilterMode === 'colour') {
          return s.tabs.map(k => {
            const label = s.tabNames[k] || (SCREENS[k] ? SCREENS[k].title : k);
            const c = s.tabColours[k] || 'none';
            const closes = s.tabFilterColour ? c === s.tabFilterColour : false;
            return { label, icon:closes ? 'close' : 'check', bg:closes ? '#5C1B18' : '#1B4D33', fg:closes ? '#FFB4AB' : '#9FF7C4' };
          });
        }
        const q = (s.tabFilterText || (s.patterns.nav || []).join('')).toLowerCase();
        return s.tabs.map(k => {
          const label = s.tabNames[k] || (SCREENS[k] ? SCREENS[k].title : k);
          let hit = q ? label.toLowerCase().indexOf(q) >= 0 : false;
          try { if (q) hit = new RegExp(q, 'i').test(label); } catch (e) {}
          const closes = s.tabFilterMode === 'not' ? !hit : hit;
          return { label, icon:closes ? 'close' : 'check', bg:closes ? '#5C1B18' : '#1B4D33', fg:closes ? '#FFB4AB' : '#9FF7C4' };
        });
      })(),
      applyTabFilter:() => {
        if (s.tabFilterMode === 'colour') {
          if (!s.tabFilterColour) return this.toast('Pick a colour first');
          const keep = s.tabs.filter(k => (s.tabColours[k] || 'none') !== s.tabFilterColour);
          this.setState({ tabs:keep.length ? keep : ['dash'], screen:keep.indexOf(s.screen) >= 0 ? s.screen : (keep[0] || 'dash'), tabFilterOpen:false });
          return this.toast('Closed every tab of that colour');
        }
        const q = (s.tabFilterText || (s.patterns.nav || []).join('')).toLowerCase();
        const keep = s.tabs.filter(k => {
          const label = (s.tabNames[k] || (SCREENS[k] ? SCREENS[k].title : k)).toLowerCase();
          let hit = q ? label.indexOf(q) >= 0 : false;
          try { if (q) hit = new RegExp(q, 'i').test(label); } catch (e) {}
          return s.tabFilterMode === 'not' ? hit : !hit;
        });
        this.setState({ tabs:keep.length ? keep : ['dash'], screen:keep.indexOf(s.screen) >= 0 ? s.screen : (keep[0] || 'dash'), tabFilterOpen:false });
        this.toast((s.tabs.length - (keep.length || 1)) + ' tabs closed');
      },
      closeTabFilter:() => this.set('tabFilterOpen', false),
      closeTabColour:() => this.set('tabColourOpen', false),
      tabs:s.tabs.filter(k => { const g = s.groups.find(x => x.tabs.indexOf(k) >= 0); return !(g && (g.collapsed || g.hidden)); }).map((k) => {
        const i = s.tabs.indexOf(k);
        return {
        label:s.tabNames[k] || (SCREENS[k] ? SCREENS[k].title : k), icon:SCREENS[k] ? SCREENS[k].icon : 'tab',
        colour:s.tabColours[k] || '#82D9A5',
        dropTarget:s.tabOver === i && s.tabDrag >= 0 && s.tabDrag !== i,
        edge:(s.tabOver === i && s.tabDrag >= 0 && s.tabDrag !== i) ? '#82D9A5' : 'transparent',
        groupName:(s.groups.find(g => g.tabs.indexOf(k) >= 0) || {}).name || '',
        inGroup:!!s.groups.find(g => g.tabs.indexOf(k) >= 0),
        groupColour:(s.groups.find(g => g.tabs.indexOf(k) >= 0) || {}).colour || '#82D9A5',
        onDragStart:() => this.setState({ tabDrag:i }),
        onDragOver:(e) => { e.preventDefault(); if (s.tabOver !== i) this.set('tabOver', i); },
        onDragEnd:() => this.setState({ tabDrag:-1, tabOver:-1 }),
        onDrop:(e) => {
          e.preventDefault();
          const from = s.tabDrag;
          if (from < 0 || from === i) return this.setState({ tabDrag:-1, tabOver:-1 });
          if (e.shiftKey) {
            const a = s.tabs.slice(); const [m] = a.splice(from, 1); a.splice(i, 0, m);
            return this.setState({ tabs:a, tabDrag:-1, tabOver:-1 });
          }
          const dragged = s.tabs[from], target = k;
          const existing = s.groups.find(g => g.tabs.indexOf(target) >= 0);
          let groups;
          if (existing) groups = s.groups.map(g => g === existing ? Object.assign({}, g, { tabs:g.tabs.concat([dragged]) }) : g);
          else groups = s.groups.concat([{ id:'g' + Date.now(), name:'New group', colour:s.tabColours[target] || '#8AB4F8', collapsed:false, tabs:[target, dragged] }]);
          this.setState({ groups, tabDrag:-1, tabOver:-1 });
          this.fire('Grouped', dragged + ' and ' + target + ' are now one tab group.');
        },
        on:k === s.screen, off:k !== s.screen, pinned:s.pinned.indexOf(k) >= 0,
        go:() => this.setState({ screen:k, railId:SCREENS[k] ? SCREENS[k].rail : s.railId }),
        close:(e) => { if (e && e.stopPropagation) e.stopPropagation(); const t = s.tabs.filter(x => x !== k); this.setState({ tabs:t.length ? t : ['dash'], screen:k === s.screen ? (t[0] || 'dash') : s.screen }); },
        ctx:(e) => { e.preventDefault(); this.setState({ ctxOpen:true, ctxTabKey:k, ctxX:e.clientX + 'px', ctxY:e.clientY + 'px', ctxTarget:'tab · ' + (s.tabNames[k] || (SCREENS[k] ? SCREENS[k].title : k)), ctxKind:'tab' }); }
        };
      }),
      newTab:() => { const next = ORDER.find(k => s.tabs.indexOf(k) < 0) || 'dash'; this.setState({ tabs:s.tabs.concat([next]), screen:next, railId:SCREENS[next].rail }); },
      dockOpts:[
        { label:'Rail on the left', icon:'dock_to_right', v:'left' },
        { label:'Rail on the right', icon:'dock_to_left', v:'right' },
        { label:'Rail on top', icon:'dock_to_bottom', v:'top' },
        { label:'Compact rail', icon:'width_normal', v:'compact' }
      ].map(d => ({ label:d.label, icon:d.icon, on:s.dock === d.v, off:s.dock !== d.v, pick:() => { this.set('dock', d.v); this.toast('Docked ' + d.label.toLowerCase()); } })),
      dockDirection:s.dock === 'right' ? 'row-reverse' : (s.dock === 'top' ? 'column' : 'row'),
      isCustomise:s.screen === 'customise',
      funLevel:(() => { const l = this.v('chaos_level', 2); return String(l); })(),
      funName:['Bank','Polite','Balanced','Playful','Unhinged'][this.v('chaos_level', 2)],
      funBlurb:[
        'Zero decoration. No celebration, no jokes, no confetti. Toasts state facts and nothing moves that does not have to.',
        'Quiet competence. Short confirmations, minimal motion, no jokes.',
        'The default. Celebrations for meaningful wins and security improvements, warm copy, motion that helps you follow what changed.',
        'Jokes in the copy, bolder motion, confetti for more things, and the one-click setup narrates itself.',
        'Confetti for moving a slider. Rainbow fills. An app that will not stop congratulating you. Genuinely usable, deeply unserious.'
      ][this.v('chaos_level', 2)],
      funLevels:[0, 1, 2, 3, 4].map(n => ({ num:String(n), name:['Bank','Polite','Balanced','Playful','Unhinged'][n],
        desc:['nothing moves','quiet','sensible default','jokes and motion','confetti everywhere'][n],
        on:this.v('chaos_level', 2) === n, off:this.v('chaos_level', 2) !== n,
        pick:() => this.setVal({ id:'chaos_level', label:'Chaos level' }, n) })),
      funOn:this.v('chaos_level', 2) > 0,
      funIcon:this.v('chaos_level', 2) > 0 ? 'celebration' : 'work',
      funLabel:this.v('chaos_level', 2) > 0 ? 'FUN IS ON' : 'FUN IS OFF',
      funBtnBg:this.v('chaos_level', 2) > 0 ? '#9FF7C4' : 'rgba(0,0,0,.32)',
      funKnobBg:this.v('chaos_level', 2) > 0 ? '#00391F' : '#1B211C',
      funKnobFg:this.v('chaos_level', 2) > 0 ? '#9FF7C4' : '#8FA394',
      funKnobAnim:this.v('chaos_level', 2) > 2 ? 'm3Wiggle 1.6s ease-in-out infinite' : 'none',
      funLabelFg:this.v('chaos_level', 2) > 0 ? '#00391F' : '#9FF7C4',
      toggleFun:() => { const on = this.v('chaos_level', 2) > 0; this.setVal({ id:'chaos_level', label:'Chaos level' }, on ? 0 : 3); if (!on) this.fire('Fun restored', 'Level 3. Brace yourself.'); },
      maxFun:() => { this.setState(st => ({ values:Object.assign({}, st.values, { chaos_level:4, fun_random:true, fun_confetti:300, fun_copy:'Comedian', th_rainbow:true, fun_random_scope:['Colour','Radius','Shadow','Type weight','Size','Rotation','Entrance animation'], fun_random_strength:100, fun_random_reroll:true }) })); this.fire('MAXIMUM FUN', 'Every element now has its own random look, rerolling as you go.'); },
      zeroFun:() => { this.setState(st => ({ values:Object.assign({}, st.values, { chaos_level:0, fun_random:false, th_rainbow:false, fun_confetti:0, fun_copy:'Terse' }) })); this.toast('Fun disabled. The console is now a spreadsheet with opinions.'); },
      toggleRandom:() => { const on = this.v('fun_random', false); this.setVal({ id:'fun_random', label:'Random appearance for every element', kind:'switch' }, !on); if (!on) this.fire('Randomised', 'Every element just got its own look.'); },
      rndBtnBg:this.v('fun_random', false) ? '#1B4D33' : 'rgba(0,0,0,.24)',
      rndBtnBorder:this.v('fun_random', false) ? '#9FF7C4' : 'rgba(159,247,196,.3)',
      rndTrack:this.v('fun_random', false) ? '#9FF7C4' : '#414942',
      rndJustify:this.v('fun_random', false) ? 'flex-end' : 'flex-start',
      rndKnob:this.v('fun_random', false) ? '#00391F' : '#8B938C',
      rndFg:this.v('fun_random', false) ? '#9FF7C4' : '#DFF3E5',
      rerollNow:() => { this.setState(st => ({ rndNonce:st.rndNonce + 1 })); this.toast('Rerolled — every element has a new look'); },
      isServers:sc.kind === 'servers', isArcade:sc.kind === 'arcade', isTrunkAuth:sc.kind === 'trunkauth', isHistory:sc.kind === 'history',
      branchName:s.branch, commitCount:s.commits.length + ' commits',
      branches:['main', 'hardening', 'lab'].map(b => ({ label:b, on:s.branch === b, off:s.branch !== b, pick:() => { this.set('branch', b); this.toast('Checked out ' + b); } })),
      histFilters:['All', 'pjsip.conf', 'queues.conf', 'This screen'].map(f => ({ label:f, on:s.histFilter === f, off:s.histFilter !== f, pick:() => this.set('histFilter', f) })),
      // "New branch" and "Export bundle" used to claim they had done exactly that. The
      // real local history behind this screen (control-plane/local-history.ts) is an
      // append-only Git log with record/list/diff/restore/prune -- no branch-checkout and
      // no bundle export. Rather than invent either, these two say plainly they are not
      // built yet: dimmed, with a tooltip and an honest toast naming what is missing.
      histActions:[
        { icon:'add_circle', label:'Commit now', fg:'#C4CBC2', hint:'', run:() => this.fire('Committed', 'Working tree is clean.') },
        { icon:'call_split', label:'New branch', fg:'#778078', hint:'Not built yet: this history is a straight append-only log, with no branch checkout behind it.', run:() => this.toast('Branching is not built yet — this history is a straight append-only log with no branch checkout') },
        { icon:'sell', label:'Tag this state', fg:'#C4CBC2', hint:'', run:() => this.fire('Tagged', 'You can restore to this exact point later.') },
                { icon:'search', label:'Search history', fg:'#C4CBC2', hint:'', run:() => this.setState({ regexOpen:true, regexTarget:'nav', regexX:'40%', regexY:'160px' }) },
        { icon:'download', label:'Export bundle', fg:'#778078', hint:'Not built yet: nothing here writes a git bundle file to disk.', run:() => this.toast('Bundle export is not built yet — nothing was written to disk') }
      ],
      commitRows:s.commits.filter(c => s.histFilter === 'All' || (s.histFilter === 'This screen' ? c.screen === s.screen : c.file === s.histFilter)).map(c => ({
        sha:c.sha, tag:c.tag, hasTag:!!c.tag,
        msg:c.file + ': ' + c.label + ' ' + c.from + ' → ' + c.to,
        meta:c.author + ' · ' + c.when + ' · ' + c.branch,
        bg:s.histSel === c.sha ? '#1D2A22' : 'transparent',
        dot:c.branch === 'main' ? '#82D9A5' : '#FFD68A',
        cmpFg:s.histCompare.indexOf(c.sha) >= 0 ? '#82D9A5' : '#778078',
        pick:() => this.set('histSel', c.sha),
        compare:(e) => { if (e && e.stopPropagation) e.stopPropagation(); const cur = s.histCompare.indexOf(c.sha) >= 0 ? s.histCompare.filter(x => x !== c.sha) : s.histCompare.concat([c.sha]).slice(-2); this.set('histCompare', cur); },
        ctx:(e) => { e.preventDefault(); this.setState({ ctxOpen:true, ctxSub:'', ctxX:e.clientX + 'px', ctxY:e.clientY + 'px', ctxTarget:'commit ' + c.sha, ctxKind:'row' }); }
      })),
      diffFile:(() => { const c = s.commits.find(x => x.sha === s.histSel) || s.commits[0]; return c ? c.file + ' @ ' + c.sha : 'no commit selected'; })(),
      diffLines:(() => {
        const c = s.commits.find(x => x.sha === s.histSel) || s.commits[0];
        if (!c) return [{ text:'nothing selected', color:'#8FA394', bg:'transparent' }];
        return [
          { text:'@@ ' + c.file + ' @@', color:'#8AB4F8', bg:'transparent' },
          { text:'- ' + c.key + ' = ' + c.from, color:'#FFB4AB', bg:'rgba(147,0,10,.18)' },
          { text:'+ ' + c.key + ' = ' + c.to, color:'#9FF7C4', bg:'rgba(0,82,48,.28)' },
          { text:'  ; changed by ' + c.author + ' ' + c.when, color:'#8FA394', bg:'transparent' }
        ];
      })(),
      diffActions:[
        { icon:'restore', label:'Restore this', bg:'#82D9A5', fg:'#00391F', hint:'', run:() => this.areYouSure('Restore this commit', 'The configuration returns to this exact state. A new commit records the restore, so nothing is lost either way.', 3, () => this.ceremony('Restore configuration', 'git revert --no-commit ' + (s.histSel || 'HEAD'))) },
        // Sets the single option this commit changed back to its "from" value through the
        // same setVal() every real control on the console uses, which records its own new
        // commit -- rather than a toast claiming a revert that touched no state at all.
        { icon:'undo', label:'Revert just this option', bg:'#262B26', fg:'#9FF7C4', hint:'', run:() => {
          const c = s.commits.find(x => x.sha === s.histSel) || s.commits[0];
          if (!c) { this.toast('Nothing selected to revert'); return; }
          this.setVal({ id:c.key, label:c.label }, c.from);
        } },
        { icon:'content_copy', label:'Copy diff', bg:'#262B26', fg:'#9FF7C4', hint:'', run:() => this.hostAction('copy', { what:'diff', text:S(v.diffText) }) },
        // Same gap as "New branch" above: this history has no branch-checkout behind it.
        { icon:'call_split', label:'Branch from here', bg:'#262B26', fg:'#778078', hint:'Not built yet: this history is a straight append-only log, with no branch checkout behind it.', run:() => this.toast('Branching is not built yet — this history is a straight append-only log with no branch checkout') }
      ],
      blameRows:s.commits.slice(0, 5).map(c => ({ sha:c.sha, what:c.file + ' · ' + c.label, who:c.author })),
      compareLabel:s.histCompare.length === 2 ? ('Comparing ' + s.histCompare[0] + ' with ' + s.histCompare[1] + ' — 1 file, 1 option differs.') : 'Pick two commits with the compare buttons to see everything that differs between them.',
      authRequests:AUTH_REQS.filter(r => (s.authAnswers[r.id] || 'Pending') === 'Pending' || s.authAnswers[r.id] === 'Deferred').map(r => ({
        title:r.title, body:r.body, when:r.when, icon:r.icon,
        iconColor:r.risk === 'High risk' ? '#FFB4AB' : (r.risk === 'Medium risk' ? '#FFD68A' : '#82D9A5'),
        risk:r.risk, riskBg:r.risk === 'High risk' ? '#5C1B18' : (r.risk === 'Medium risk' ? '#4A3B18' : '#1B4D33'),
        riskFg:r.risk === 'High risk' ? '#FFB4AB' : (r.risk === 'Medium risk' ? '#FFD68A' : '#9FF7C4'),
        facts:r.facts,
        state:s.authAnswers[r.id] === 'Deferred' ? 'deferred — expires in 46h' : 'awaiting your answer',
        stateFg:s.authAnswers[r.id] === 'Deferred' ? '#FFD68A' : '#8FA394',
        yes:() => this.answerAuth(r, 'YES'),
        no:() => this.answerAuth(r, 'NO'),
        // There is no messaging channel to a trunk partner anywhere in this console --
        // "sent" was never true. Defer and the YES/NO answer are both real state changes;
        // this one says plainly it cannot reach the partner yet, rather than claiming it did.
        askHint:'Not built yet: nothing here can message ' + r.partner + '. Defer the request or answer it directly.',
        ask:() => this.toast('Nothing here can message ' + r.partner + ' yet — defer this request or answer it directly'),
        defer:() => this.setState({ authAnswers:Object.assign({}, s.authAnswers, { [r.id]:'Deferred' }) })
      })),
      authHistory:AUTH_REQS.filter(r => s.authAnswers[r.id] === 'YES' || s.authAnswers[r.id] === 'NO').map(r => ({
        partner:r.partner, what:r.title, answer:s.authAnswers[r.id], when:'just now',
        color:s.authAnswers[r.id] === 'YES' ? '#82D9A5' : '#FFB4AB'
      })).concat([
        { partner:'carrier-primary', what:'Raise concurrent call cap to 60', answer:'YES', when:'3d', color:'#82D9A5' },
        { partner:'branch-iax', what:'Add 203.0.113.44 as a source address', answer:'NO', when:'6d', color:'#FFB4AB' },
        { partner:'carrier-backup', what:'Enable opus on the shared link', answer:'YES', when:'11d', color:'#82D9A5' }
      ]),
      // Same gap as "Ask for detail" above: there is no composer here and no channel to a
      // partner. "Composing a request — pick the partner..." implied a composer was about
      // to open; none does, so this now says plainly that it does not exist yet.
      newAuthRequest:() => this.toast('A request composer is not built yet — there is no channel to a partner from this console'),
      credits:s.credits,
      games:GAMES.map(g => ({ icon:g.icon, name:g.name, blurb:g.blurb, reward:'+' + g.reward + ' credits', on:s.game === g.id, off:s.game !== g.id, pick:() => { this.stopGameNow(); this.setState({ game:g.id, gameScore:0 }); } })),
      gameTitle:(GAMES.find(g => g.id === s.game) || GAMES[0]).name,
      gameBlurb:(GAMES.find(g => g.id === s.game) || GAMES[0]).blurb,
      gameScore:s.gameScore + ' pts',
      gameClock:s.gamePlaying ? s.gameTime + 's left' : 'ready',
      gameButton:s.gamePlaying ? 'Playing…' : 'Start · 20s',
      gameCells:Array.from({ length:15 }, (_, i) => ({
        up:s.gamePlaying && i === s.gameCell, down:!(s.gamePlaying && i === s.gameCell),
        icon:['sports_martial_arts', 'call', 'dialpad', 'cable', 'notifications_active'][i % 5],
        hit:() => { const sc2 = this.state.gameScore + 10; this.setState({ gameScore:sc2, gameCell:Math.floor(Math.random() * 15) }); },
        miss:() => { if (this.state.gamePlaying) this.setState({ gameScore:Math.max(0, this.state.gameScore - 2) }); }
      })),
      gWhack:gk === 'whack', gDtmf:gk === 'dtmf', gSort:gk === 'sort', gMatch:gk === 'match', gSpot:gk === 'spot', gReflex:gk === 'reflex',
      dtmfPhase:s.dtmfShow ? 'watch the sequence' : 'now tap it back',
      dtmfShown:s.dtmfShow ? s.dtmfSeq.join('') : (s.dtmfIn.join('') || '····'),
      dtmfKeys:['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(k => ({ label:k, press:() => {
        if (s.dtmfShow) return;
        const inp = s.dtmfIn.concat([k]);
        const ok = s.dtmfSeq[inp.length - 1] === k;
        if (!ok) { this.setState({ dtmfIn:[], gameScore:Math.max(0, s.gameScore - 5) }); return this.toast('Wrong tone — sequence restarts'); }
        if (inp.length === s.dtmfSeq.length) { const nxt = s.dtmfSeq.concat([String(Math.floor(Math.random() * 9) + 1)]); this.setState({ gameScore:s.gameScore + 15, dtmfSeq:nxt, dtmfIn:[], dtmfShow:true }); this.fire('Correct', 'Longer sequence incoming.'); setTimeout(() => this.setState({ dtmfShow:false }), 1400); }
        else this.setState({ dtmfIn:inp });
      } })),
      sortHint:'Lowest bandwidth at the top, then check your answer.',
      sortItems:s.sortList.map((x, i) => ({ label:x, pos:String(i + 1), bg:'#141A15',
        up:() => { if (i === 0) return; const a = s.sortList.slice(); a[i] = a[i - 1]; a[i - 1] = x; this.set('sortList', a); },
        down:() => { if (i === s.sortList.length - 1) return; const a = s.sortList.slice(); a[i] = a[i + 1]; a[i + 1] = x; this.set('sortList', a); } })),
      sortCheck:() => {
        const right = s.sortList.every((x, i) => x === CODEC_ORDER[i]);
        if (right) { this.setState({ gameScore:s.gameScore + 40, sortList:CODEC_ORDER.slice().sort(() => Math.random() - 0.5) }); this.fire('Perfect order', '+40 points. Have another.'); }
        else this.toast('Not quite — g729 is the smallest, opus the largest');
      },
      matchTiles:(() => {
        const tiles = [];
        MATCH_PAIRS.forEach(([a, b], i) => { tiles.push({ id:'a' + i, pair:i, label:a, mono:true }); tiles.push({ id:'b' + i, pair:i, label:b, mono:false }); });
        return tiles.sort((x, y) => (x.id.charCodeAt(1) * 7 + x.id.charCodeAt(0)) - (y.id.charCodeAt(1) * 7 + y.id.charCodeAt(0))).map(t => {
          const done = s.matchDone.indexOf(t.pair) >= 0;
          const sel = s.matchSel === t.id;
          return { label:t.label,
            bg:done ? '#005230' : (sel ? '#1B4D33' : '#141A15'),
            border:sel ? '#82D9A5' : 'transparent',
            fg:done ? '#9FF7C4' : '#DFE4DC',
            pick:() => {
              if (done) return;
              if (!s.matchSel) return this.set('matchSel', t.id);
              const prev = s.matchSel;
              if (prev === t.id) return this.set('matchSel', '');
              const prevPair = Number(prev.slice(1));
              if (prevPair === t.pair && prev[0] !== t.id[0]) {
                const d = s.matchDone.concat([t.pair]);
                this.setState({ matchDone:d, matchSel:'', gameScore:s.gameScore + 20 });
                if (d.length === MATCH_PAIRS.length) this.fire('All six matched', 'You actually know what these do.');
              } else { this.setState({ matchSel:'', gameScore:Math.max(0, s.gameScore - 3) }); this.toast('Not a pair'); }
            } };
        });
      })(),
      spotLines:SPOT_LINES.map((l, i) => ({ text:l.t, bg:s.spotFound === i ? (l.bad ? '#005230' : '#4A1F1B') : 'transparent', fg:s.spotFound === i ? (l.bad ? '#9FF7C4' : '#FFB4AB') : '#C4CBC2',
        pick:() => { if (l.bad) { this.setState({ spotFound:i, gameScore:s.gameScore + 30 }); this.fire('Found it', 'A desk phone should not sit in from-external.'); } else { this.setState({ spotFound:i, gameScore:Math.max(0, s.gameScore - 5) }); this.toast('That line is fine'); } } })),
      reflexTarget:s.reflexNum,
      reflexHint:'Tap the last digit of the number above.',
      reflexKeys:['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(k => ({ label:k, press:() => {
        if (k === s.reflexNum.slice(-1)) { this.setState({ gameScore:s.gameScore + 8, reflexNum:String(1000 + Math.floor(Math.random() * 9000)) }); }
        else this.setState({ gameScore:Math.max(0, s.gameScore - 4) });
      } })),
      startGame:() => {
        if (this.state.gamePlaying) return;
        this.setState({ gamePlaying:true, gameScore:0, gameTime:20, gameCell:Math.floor(Math.random() * 15) });
        clearInterval(this._g);
        this._g = setInterval(() => {
          const t = this.state.gameTime - 1;
          if (t <= 0) {
            clearInterval(this._g);
            const g = GAMES.find(x => x.id === this.state.game) || GAMES[0];
            const won = this.state.gameScore >= 60 ? g.reward : Math.max(1, Math.round(g.reward / 2));
            this.setState({ gamePlaying:false, gameTime:0, gameCell:-1, credits:this.state.credits + won });
            this.fire('+' + won + ' credits', 'Scored ' + this.state.gameScore + '. Spend them on skipping ceremonies.');
          } else this.setState({ gameTime:t, gameCell:Math.floor(Math.random() * 15) });
        }, 900);
      },
      stopGame:() => this.stopGameNow(),
      spendCredit:() => { if (s.credits < 1) return this.toast('No credits — win some in the arcade'); this.setState({ credits:s.credits - 1 }); this.fire('Ceremony skipped', 'One credit spent. ' + (s.credits - 1) + ' left.'); },
      oneClickPitch:s.oneClickMode === 'Funny'
        ? 'Press it. Walk away. Come back to a phone system that works, plus roughly forty jokes you did not ask for. It sets up the server, the phones, the queue, the certificates and the hardening, and it explains each step like you are five and slightly suspicious.'
        : 'Provisions the server, installs Asterisk, creates four extensions, one queue, TLS transports and a hardened access policy. Roughly seven seconds of work, then a production-shaped PBX.',
      oneClickButton:s.oneClickRunning ? 'Working on it…' : 'Deploy the whole thing',
      basicCtls:[
        ctl('bs_phones','How many phones?','stepper',8,{ min:1, max:500 }),
        ctl('bs_menu','Menu before a human','switch',true),
        ctl('bs_hours','Close at night','switch',true),
        ctl('bs_tls','Encrypt everything','switch',true)
      ].map(this.buildCtl),
      oneClickModes:['Funny','Very funny','Just do it quietly'].map(m => ({ label:m, on:s.oneClickMode === m, off:s.oneClickMode !== m, pick:() => this.setState({ oneClickMode:m }) })),
      oneClickRunning:s.oneClickRunning,
      oneClickStage:ONE_CLICK_LOG[Math.min(s.oneClickStep, ONE_CLICK_LOG.length - 1)].text,
      oneClickPct:Math.round(s.oneClickStep / ONE_CLICK_LOG.length * 100) + '%',
      oneClickLog:ONE_CLICK_LOG.slice(0, s.oneClickStep).reverse().map((l, i) => ({ text:l.text, ms:l.ms, icon:i === 0 ? 'pending' : 'check_circle', color:i === 0 ? '#DFE4DC' : '#82D9A5' })),
      runOneClick:() => {
        if (s.oneClickRunning) return;
        this.setState({ oneClickRunning:true, oneClickStep:0 });
        clearInterval(this._oc);
        this._oc = setInterval(() => {
          const n = this.state.oneClickStep + 1;
          if (n >= ONE_CLICK_LOG.length) {
            clearInterval(this._oc);
            this.setState({ oneClickStep:n, oneClickRunning:false });
            this.fire('It is alive', 'Four extensions, one queue, TLS everywhere. Try dialling 1001.');
          } else this.setState({ oneClickStep:n });
        }, 780);
      },

      screenLocked:!!s.locks[s.screen], lockedTitle:sc.title,
      unlockOpen:s.unlockOpen,
      openUnlock:() => this.setState({ unlockOpen:true, unlockKey:s.screen, unlockPin:'', unlockPw:'' }),
      closeUnlock:() => this.set('unlockOpen', false),
      unlockMethod:(s.locks[s.unlockKey] || {}).method || 'PIN',
      unlockNeedsPin:((s.locks[s.unlockKey] || {}).method || 'PIN').indexOf('PIN') >= 0,
      unlockNeedsPw:((s.locks[s.unlockKey] || {}).method || '').indexOf('Password') >= 0,
      unlockNeedsTotp:((s.locks[s.unlockKey] || {}).method || '').indexOf('TOTP') >= 0,
      unlockPwValue:s.unlockPw || '',
      onUnlockPw:(e) => this.set('unlockPw', e.target.value),
      unlockDots:Array.from({ length:6 }, (_, i) => ({ bg:i < s.unlockPin.length ? '#82D9A5' : 'transparent' })),
      unlockKeys:['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].map(k => ({ label:k, press:() => {
        if (k === '⌫') return this.setState(st => ({ unlockPin:st.unlockPin.slice(0, -1) }));
        if (k === '✓') return this.tryUnlock();
        this.setState(st => ({ unlockPin:st.unlockPin.length < 6 ? st.unlockPin + k : st.unlockPin }));
      } })),
      submitUnlock:() => this.tryUnlock(),

      navSearchLabel:(s.patterns.nav.length ? s.patterns.nav.join('') : 'Search sections…'),
      tableSearchLabel:(s.patterns.table.length ? s.patterns.table.join('') : 'Search rows…'),
      openNavRegex:() => this.setState({ regexOpen:true, regexTarget:'nav', regexX:'120px', regexY:'150px' }),
      openTableRegex:() => this.setState({ regexOpen:true, regexTarget:'table', regexX:'420px', regexY:'180px' }),
      regexOpen:s.regexOpen,
      regexX:this.pos('regex', s.regexX, s.regexY)[0], regexY:this.pos('regex', s.regexX, s.regexY)[1],
      regexTargetLabel:s.regexTarget === 'nav' ? 'section list' : (s.regexTarget === 'table' ? 'row filter' : 'memory search'),
      rxText:s.rxText || (s.patterns[s.regexTarget] || []).join(''),
      onRxText:(e) => { const v = e.target.value; const p = Object.assign({}, s.patterns); p[s.regexTarget] = v ? [v] : []; this.setState({ rxText:v, patterns:p }); },
      regexFlagStr:s.regexFlags.join(''),
      regexValid:(() => { const v = s.rxText || (s.patterns[s.regexTarget] || []).join(''); if (!v) return 'empty'; try { new RegExp(v); return 'valid'; } catch (e) { return 'invalid'; } })(),
      regexValidColor:(() => { const v = s.rxText || (s.patterns[s.regexTarget] || []).join(''); if (!v) return '#8FA394'; try { new RegExp(v); return '#82D9A5'; } catch (e) { return '#FFB4AB'; } })(),
      regexExplain:(() => {
        const v = s.rxText || (s.patterns[s.regexTarget] || []).join('');
        if (!v) return 'No pattern yet, so everything matches.';
        const parts = [];
        if (v.indexOf('^') === 0) parts.push('starts with what follows');
        if (v.slice(-1) === '$') parts.push('ends there — nothing after');
        if (/\\d/.test(v)) parts.push('expects digits');
        if (/\\w/.test(v)) parts.push('expects letters or digits');
        if (/\+/.test(v)) parts.push('one or more of the piece before the plus');
        if (/\*/.test(v)) parts.push('any number of the piece before the star, including none');
        if (/\?/.test(v)) parts.push('something optional');
        if (/\|/.test(v)) parts.push('either side of the bar will do');
        if (/\{\d/.test(v)) parts.push('a counted repeat');
        if (/\(\?!/.test(v)) parts.push('a negative lookahead — must NOT be followed by that');
        if (/\[.*\]/.test(v)) parts.push('any one character from the bracketed set');
        if (s.regexFlags.indexOf('i') >= 0) parts.push('case is ignored');
        return parts.length ? ('Matches text that ' + parts.join(', and ') + '.') : ('Matches the literal text “' + v + '” anywhere in the value.');
      })(),
      rxTools:[
        { icon:'backspace', label:'Delete last', title:'Remove the last piece', run:() => { const v = (s.rxText || '').slice(0, -1); const p = Object.assign({}, s.patterns); p[s.regexTarget] = v ? [v] : []; this.setState({ rxText:v, patterns:p }); } },
        { icon:'auto_fix_high', label:'Escape literals', title:'Treat what you typed as plain text', run:() => { const v = (s.rxText || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); const p = Object.assign({}, s.patterns); p[s.regexTarget] = [v]; this.setState({ rxText:v, patterns:p }); } },
        { icon:'data_array', label:'Wrap in group', title:'Wrap the whole pattern in a capture group', run:() => { const v = '(' + (s.rxText || '') + ')'; const p = Object.assign({}, s.patterns); p[s.regexTarget] = [v]; this.setState({ rxText:v, patterns:p }); } },
        { icon:'swap_horiz', label:'Anchor both ends', title:'Require a full match', run:() => { let v = s.rxText || ''; if (v.indexOf('^') !== 0) v = '^' + v; if (v.slice(-1) !== '$') v = v + '$'; const p = Object.assign({}, s.patterns); p[s.regexTarget] = [v]; this.setState({ rxText:v, patterns:p }); } },
        { icon:'bookmark_add', label:'Save pattern', title:'Save this pattern', run:() => this.hostAction('save', { bucket:'regex-pattern', name:S(v.regexValue) }) },
        { icon:'library_books', label:'Cheatsheet', title:'Explain every token', run:() => this.showInfo('Regex cheatsheet', 'Anchors pin the match to the start (^) or end ($). Character classes stand in for kinds of character: \\d a digit, \\w a letter or digit, \\s a space, and a dot for anything at all. Quantifiers say how many: + is one or more, * is any number including none, ? makes the piece optional, and {2,4} means between two and four. Brackets are a set of allowed characters, parentheses group things together, and a bar between two options means either will do.', 'Think of it as a sentence describing what the text should look like, written in shorthand. You never have to write it by hand here — the buttons build it.') }
      ],
      regexValue:(s.patterns[s.regexTarget] || []).join('') || '(everything)',
      regexChips:(s.patterns[s.regexTarget] || []).map((t, i) => ({ label:t, remove:() => { const p = Object.assign({}, s.patterns); p[s.regexTarget] = p[s.regexTarget].filter((_, j) => j !== i); this.setState({ patterns:p }); } })),
      regexGroups:REGEX_GROUPS.map(g => ({ title:g.title, items:g.items.map(([token, label]) => ({ token, label, add:() => { const p = Object.assign({}, s.patterns); p[s.regexTarget] = (p[s.regexTarget] || []).concat([token]); this.setState({ patterns:p }); } })) })),
      regexFlags:[['i', 'ignore case'], ['g', 'all matches'], ['m', 'multiline'], ['s', 'dot matches newline']].map(([f, l]) => ({ label:f + ' · ' + l, on:s.regexFlags.indexOf(f) >= 0, off:s.regexFlags.indexOf(f) < 0, toggle:() => this.set('regexFlags', s.regexFlags.indexOf(f) >= 0 ? s.regexFlags.filter(x => x !== f) : s.regexFlags.concat([f])) })),
      regexCount:(() => { const pat = (s.patterns[s.regexTarget] || []).join(''); if (!pat) return 'no filter'; try { new RegExp(pat); return 'valid pattern'; } catch (e) { return 'invalid pattern'; } })(),
      regexPreview:(() => {
        const pat = (s.patterns[s.regexTarget] || []).join('');
        const pool = s.regexTarget === 'nav' ? ORDER.map(k => SCREENS[k].label) : (sc.table ? sc.table.rows.map(r => r[0]) : ORDER.map(k => SCREENS[k].label));
        let re = null; try { re = pat ? new RegExp(pat, s.regexFlags.filter(f => f !== 'g').join('')) : null; } catch (e) { return [{ text:'pattern is not valid yet', icon:'error', color:'#FFB4AB' }]; }
        return pool.slice(0, 6).map(x => ({ text:x, icon:(!re || re.test(x)) ? 'check_circle' : 'remove_circle_outline', color:(!re || re.test(x)) ? '#82D9A5' : '#778078' }));
      })(),
      clearRegex:() => { const p = Object.assign({}, s.patterns); p[s.regexTarget] = []; this.setState({ patterns:p }); },
      closeRegex:() => this.set('regexOpen', false),

      ctxOpen:s.ctxOpen, ctxX:s.ctxX, ctxY:s.ctxY, ctxTarget:s.ctxTarget,
      subOpen:!!s.ctxSub,
      subItems:(() => {
        const close = () => this.setState({ ctxOpen:false, ctxSub:'' });
        const g = s.groups.find(x => x.id === s.ctxGroupId) || { id:'', tabs:[], name:'', colour:'#82D9A5' };
        const upd = (patch) => this.setState({ groups:s.groups.map(x => x.id === g.id ? Object.assign({}, x, patch) : x), ctxOpen:false, ctxSub:'' });
        if (s.ctxSub === 'gcolour') return [{ icon:'colorize', label:'Open colour picker…', run:() => this.setState({ ctxOpen:false, ctxSub:'', tabColourOpen:true, renameKey:'group:' + g.id }) }]
          .concat(['#82D9A5', '#FFD68A', '#FFB4AB', '#8AB4F8', '#D8A9F0', '#DFE4DC'].map(c => ({ icon:'circle', label:c, run:() => upd({ colour:c }) })));
        if (s.ctxSub === 'gbehave') return [
          { icon:'unfold_less', label:g.collapsed ? 'Expand' : 'Collapse', run:() => upd({ collapsed:!g.collapsed }) },
          { icon:'compress', label:'Auto-collapse when inactive', run:() => upd({ auto:true }) },
          { icon:'push_pin', label:'Pin whole group', run:() => { close(); this.set('pinned', s.pinned.concat(g.tabs)); } },
          { icon:'lock', label:'Lock this group', run:() => { close(); this.setState({ lockOpen:true, lockTarget:g.name + ' (' + g.tabs.length + ' tabs)', lockKey:'group-' + g.id, lockStep:0, lockX:'38%', lockY:'18%' }); } },
          { icon:'sync', label:'Reload every tab in group', run:() => { close(); this.ceremony('Reload group ' + g.name, 'reload ' + g.tabs.join(' ')); } },
          { icon:'visibility_off', label:'Hide from the strip', run:() => upd({ hidden:true }) }
        ];
        if (s.ctxSub === 'gtabs') return g.tabs.map(t => ({ icon:SCREENS[t] ? SCREENS[t].icon : 'tab', label:s.tabNames[t] || (SCREENS[t] ? SCREENS[t].title : t), run:() => { close(); this.openScreen(t); } }));
        if (s.ctxSub === 'gsave') return [
          { icon:'download', label:'Export group as JSON', run:() => { close(); this.hostAction('export-json', { name:g.name, subject:'group', data:g }); } },
          { icon:'upload', label:'Import a group…', run:() => { close(); this.hostAction('import-json', { subject:'group' }); } },
          { icon:'bookmark_add', label:'Save as a workspace', run:() => { close(); this.hostAction('save', { bucket:'workspace', name:'Workspace', data:{ tabs:s.tabs, groups:s.groups } }); } },
          { icon:'restore', label:'Restore last session', run:() => { close(); this.hostAction('restore', { bucket:'workspace' }); } }
        ];
        if (s.ctxSub === 'tabexport') return [
          { icon:'download', label:'Export this tab', run:() => { close(); this.hostAction('export-json', { name:t.label, subject:'tab', data:t }); } },
          { icon:'download_for_offline', label:'Export all tabs', run:() => { close(); this.hostAction('export-json', { name:'tabs', subject:'tabs and groups', data:{ tabs:s.tabs, groups:s.groups } }); } },
          { icon:'upload', label:'Import tabs…', run:() => { close(); this.hostAction('import-json', { subject:'tabs' }); } },
          { icon:'content_copy', label:'Copy tab list to clipboard', run:() => { close(); this.hostAction('copy', { what:'the tab list', text:s.tabs.map(t => t.label).join('\n') }); } }
        ];
        if (s.ctxSub !== 'closetabs') return [];
        const k = s.ctxTabKey || s.screen, i = s.tabs.indexOf(k);
        return [
          { icon:'first_page', label:'To the left', run:() => { close(); this.setState({ tabs:s.tabs.slice(i) }); } },
          { icon:'last_page', label:'To the right', run:() => { close(); this.setState({ tabs:s.tabs.slice(0, i + 1) }); } },
          { icon:'tab_close_right', label:'All others', run:() => { close(); this.setState({ tabs:[k], screen:k }); } },
          { icon:'search', label:'Containing…', run:() => this.setState({ ctxOpen:false, ctxSub:'', tabFilterOpen:true, tabFilterMode:'has', tabFilterText:'' }) },
          { icon:'search_off', label:'Not containing…', run:() => this.setState({ ctxOpen:false, ctxSub:'', tabFilterOpen:true, tabFilterMode:'not', tabFilterText:'' }) },
          { icon:'format_color_fill', label:'By colour…', run:() => this.setState({ ctxOpen:false, ctxSub:'', tabFilterOpen:true, tabFilterMode:'colour', tabFilterText:'' }) },
          { icon:'label_off', label:'All uncoloured', run:() => { close(); this.setState({ tabs:s.tabs.filter(t => s.tabColours[t] || t === k) }); } },
          { icon:'push_pin', label:'All unpinned', run:() => { close(); this.setState({ tabs:s.tabs.filter(t => s.pinned.indexOf(t) >= 0 || t === k) }); } }
        ];
      })(),
      subX:(parseInt(s.ctxX, 10) + 266) + 'px',
      subY:(parseInt(s.ctxY, 10) + 84) + 'px',
      ctxScreen:(e) => { e.preventDefault(); this.setState({ ctxOpen:true, ctxX:e.clientX + 'px', ctxY:e.clientY + 'px', ctxTarget:sc.title + ' · ' + (sc.file || 'console'), ctxKind:'screen' }); },
      ctxSearch:(e) => { e.preventDefault(); this.setState({ ctxOpen:true, ctxX:e.clientX + 'px', ctxY:e.clientY + 'px', ctxTarget:'search field', ctxKind:'search' }); },
      closeCtx:(e) => { if (e && e.preventDefault) e.preventDefault(); this.set('ctxOpen', false); },
      ctxItems:(() => {
        const close = () => this.setState({ ctxOpen:false, ctxSub:'' });
        const decorate = (list) => list.map(it => Object.assign({}, it, {
          bg:it.sub && s.ctxSub === it.sub ? '#333B34' : 'transparent',
          hover:() => this.set('ctxSub', it.sub || ''),
          act:it.sub ? (() => this.set('ctxSub', it.sub)) : it.run
        }));
        this._dec = decorate;
        const common = [
          { icon:'lock', label:'Lock this element…', hint:'⌃L', run:() => this.setState({ ctxOpen:false, lockOpen:true, lockTarget:s.ctxTarget, lockKey:s.screen, lockStep:0, pin:'', password:'', lockX:s.ctxX, lockY:s.ctxY }) },
          { icon:'brush', label:'Edit appearance…', hint:'⌃E', run:() => this.setState({ ctxOpen:false, appearOpen:true, appearTarget:s.ctxTarget }) },
          { icon:'help', label:'Explain this…', hint:'F1', run:() => { close(); this.showInfo(s.ctxTarget, sc.sub, null, s.ctxX, s.ctxY); } }
        ];
        if (s.ctxKind === 'group') {
          const g = s.groups.find(x => x.id === s.ctxGroupId) || { tabs:[], name:'' };
          const upd = (patch) => this.setState({ groups:s.groups.map(x => x.id === g.id ? Object.assign({}, x, patch) : x), ctxOpen:false, ctxSub:'' });
          return decorate([
            { icon:'edit', label:'Rename group…', hint:'F2', run:() => { close(); this.setState({ renameOpen:true, renameKey:'group:' + g.id, renameValue:g.name }); } },
            { icon:'palette', label:'Group colour', hint:'▸', sub:'gcolour' },
            { icon:'tune', label:'Group behaviour', hint:'▸', sub:'gbehave' },
            { icon:'tab', label:'Tabs in group', hint:'▸', sub:'gtabs' },
            { icon:'save', label:'Save & restore', hint:'▸', sub:'gsave' },
            { icon:'unfold_less', label:g.collapsed ? 'Expand group' : 'Collapse group', hint:'', run:() => upd({ collapsed:!g.collapsed }) },
            { icon:'link_off', label:'Ungroup', hint:'', run:() => { close(); this.setState({ groups:s.groups.filter(x => x.id !== g.id) }); this.toast('Group dissolved — tabs kept'); } },
            { icon:'close', label:'Close group and its tabs', hint:'', run:() => { close(); this.areYouSure('Close ' + g.name, 'Every tab in this group closes. Unsaved staged changes in them are discarded.', 3, () => { const keep = s.tabs.filter(t => g.tabs.indexOf(t) < 0); this.setState({ tabs:keep.length ? keep : ['dash'], screen:keep[0] || 'dash', groups:s.groups.filter(x => x.id !== g.id) }); }); } },
            { icon:'brush', label:'Edit group appearance…', hint:'⌃E', run:() => this.setState({ ctxOpen:false, appearOpen:true, appearTarget:'group · ' + g.name }) },
            { icon:'lock', label:'Lock this group…', hint:'⌃L', run:common[0].run }
          ]);
        }
        if (s.ctxKind === 'tab') {
          const k = s.ctxTabKey || s.screen;
          const i = s.tabs.indexOf(k);
          return decorate([
            { icon:'edit', label:'Rename tab…', hint:'F2', run:() => { close(); this.setState({ renameOpen:true, renameKey:k, renameValue:(s.tabNames[k] || (SCREENS[k] ? SCREENS[k].title : k)) }); } },
            { icon:'palette', label:'Tab colour…', hint:'', run:() => { close(); this.setState({ tabColourOpen:true, renameKey:k }); } },
            { icon:'brush', label:'Edit tab appearance…', hint:'⌃E', run:() => this.setState({ ctxOpen:false, appearOpen:true, appearTarget:'tab · ' + (s.tabNames[k] || (SCREENS[k] ? SCREENS[k].title : k)) }) },
            { icon:'tab_close', label:'Close tabs', hint:'▸', sub:'closetabs' },
            { icon:'push_pin', label:s.pinned.indexOf(k) >= 0 ? 'Unpin tab' : 'Pin tab', hint:'', run:() => { close(); this.set('pinned', s.pinned.indexOf(k) >= 0 ? s.pinned.filter(x => x !== k) : s.pinned.concat([k])); } },
            { icon:'content_copy', label:'Duplicate tab', hint:'⌃D', run:() => { close(); this.setState({ tabs:s.tabs.concat([k]) }); } },
            { icon:'close', label:'Close tab', hint:'⌃W', run:() => { close(); const t = s.tabs.filter(x => x !== k); this.setState({ tabs:t.length ? t : ['dash'], screen:t[0] || 'dash' }); } },
            { icon:'save', label:'Export & import', hint:'▸', sub:'tabexport' },
            { icon:'folder', label:'Group tabs by area', hint:'', run:() => { close(); const byRail = {}; s.tabs.forEach(t => { const r = (SCREENS[t] || {}).rail; if (r) { (byRail[r] = byRail[r] || []).push(t); } }); const made = Object.keys(byRail).filter(r => byRail[r].length > 1).map(r => ({ id:'area-' + r, name:((RAIL.filter(x => x.id === r)[0] || {}).groupLabel) || r, tabs:byRail[r], colour:'', collapsed:false })); if (made.length) { this.setState({ groups:made }); this.fire('Tabs grouped', made.length + ' group(s) by area.'); } else { this.fire('Nothing to group', 'No area has more than one tab open, and a group of one is just clutter.'); } } },
            { icon:'dock_to_right', label:'Dock this tab right', hint:'', run:() => { close(); this.set('dock', 'right'); } },
            { icon:'lock', label:'Lock this tab…', hint:'⌃L', run:common[0].run }
          ]);
        }
        if (s.ctxKind === 'row') {
          const name = s.ctxTarget;
          const isAclRow = s.screen === 'security';
          // A prompt row names a real file MediaLibrary already validated on the way in --
          // there is nothing on it to "edit" the way an ACL rule's fields can be reloaded
          // and resubmitted, so its own menu entry plays it back instead, and its delete
          // goes through the same media.remove path onRemoveAclRule's ACL branch already
          // set the pattern for rather than the generic (and here entirely fictional)
          // "delete <object> and everything referencing it" ceremony.
          const isPromptRow = s.screen === 'sounds';
          return decorate([
            { icon:isPromptRow ? 'play_arrow' : 'edit', label:(isPromptRow ? 'Audition ' : 'Edit ') + name + '…', hint:'↵', run:() => { close(); ((isAclRow || isPromptRow) && this.onPickRow) ? this.onPickRow(name) : this.setState({ wizardOpen:true, wizardStep:0 }); } },
            { icon:'check_box', label:'Select this row', hint:'', run:() => { close(); this.set('selected', sel.indexOf(name) >= 0 ? sel : sel.concat([name])); } },
            { icon:'content_copy', label:'Duplicate', hint:'⌃D', run:() => { close(); this.bulk('Duplicated', [name]); } },
            { icon:'refresh', label:'Reload just this', hint:'', run:() => { close(); this.ceremony('Reload ' + name, 'reload ' + name); } },
            { icon:'download', label:'Export as configuration', hint:'', run:() => { close(); this.hostAction('export-config', { name:name }); } },
            { icon:'history', label:'Version history for this', hint:'', run:() => { close(); this.openScreen('history'); } },
            ...(isAclRow && this.onMoveAclRule ? [
              { icon:'arrow_upward', label:'Move rule up', hint:'', run:() => { close(); this.onMoveAclRule(name, 'up'); } },
              { icon:'arrow_downward', label:'Move rule down', hint:'', run:() => { close(); this.onMoveAclRule(name, 'down'); } }
            ] : []),
            { icon:'delete', label:'Delete ' + name, hint:'⌦', run:() => { close(); this.areYouSure('Delete ' + name, sc.kind === 'servers' ? 'This connection profile is removed from the console. It does not touch or reconfigure the target machine.' : (isAclRow ? 'This rule is removed from acl.conf on the target -- backed up first, and rolled back automatically if the write cannot be verified.' : (isPromptRow ? 'This file is removed from /var/lib/asterisk/sounds on the target -- irreversible, and the control plane confirms the removal before this dialog reports success.' : 'This object and everything referencing it are removed. The four gates still apply after the minigame.')), 3, () => (sc.kind === 'servers' && this.onRemoveServerRow ? this.onRemoveServerRow(name) : (isAclRow && this.onRemoveAclRule ? this.onRemoveAclRule(name) : (isPromptRow && this.onRemovePromptRow ? this.onRemovePromptRow(name) : this.ceremony('Delete ' + name, 'delete ' + name))))); } },
            common[0], common[1]
          ]);
        }
        if (s.ctxKind === 'search') {
          return decorate([
            { icon:'data_object', label:'Open regex builder…', hint:'⌃R', run:() => this.setState({ ctxOpen:false, regexOpen:true, regexTarget:'table', regexX:s.ctxX, regexY:s.ctxY }) },
            { icon:'match_case', label:'Match case', hint:'', run:() => { close(); this.set('regexFlags', s.regexFlags.filter(f => f !== 'i')); } },
            { icon:'select_all', label:'Whole word only', hint:'', run:() => { close(); const b = '\\b'; if (s.regex[0] !== b || s.regex[s.regex.length - 1] !== b) this.set('regex', [b].concat(s.regex, [b])); } },
            { icon:'bookmark_add', label:'Save this search', hint:'', run:() => { close(); this.hostAction('save', { bucket:'search', name:S(v.tableQuery) }); } },
            { icon:'clear', label:'Clear search', hint:'⎋', run:() => { close(); const p = Object.assign({}, s.patterns); p.table = []; p.nav = []; this.setState({ patterns:p }); } },
            common[0], common[1]
          ]);
        }
        if (s.ctxKind === 'node') {
          return decorate([
            { icon:'edit', label:'Edit this step…', hint:'↵', run:() => close() },
            { icon:'timeline', label:'Connect to…', hint:'C', run:() => { close(); this.addEdgeFrom(); } },
            { icon:'content_copy', label:'Duplicate step', hint:'⌃D', run:() => { close(); const src = NODES.concat(s.addedNodes || []).filter(n => n.id === s.nodeId)[0]; if (!src) { this.fire('Nothing to duplicate', 'No step is selected.'); return; } const seq = (s.nodeSeq || 0) + 1; const copy = Object.assign({}, src, { id:'added-' + seq, title:src.title + ' (copy)', x:src.x + 40, y:src.y + 40 }); this.setState({ addedNodes:(s.addedNodes || []).concat([copy]), nodeSeq:seq, nodeId:copy.id }); this.fire('Step duplicated', copy.title + ' is on the canvas, offset from the original.'); } },
            { icon:'call_split', label:'Insert condition before', hint:'', run:() => { close(); const at = NODES.concat(s.addedNodes || []).filter(n => n.id === s.nodeId)[0]; if (!at) { this.fire('Nowhere to insert', 'No step is selected.'); return; } const seq = (s.nodeSeq || 0) + 1; const node = { id:'added-' + seq, x:at.x, y:Math.max(0, at.y - 96), icon:'call_split', title:'New condition', detail:'GotoIf($[<condition>]?<true>:<false>)' }; this.setState({ addedNodes:(s.addedNodes || []).concat([node]), nodeSeq:seq, nodeId:node.id }); this.fire('Condition inserted', 'An empty condition is above ' + at.title + '. Fill it in to make it do something.'); } },
            { icon:'delete', label:'Delete step', hint:'⌦', run:() => { close(); this.areYouSure('Delete this step', 'The step and its connections are removed from the dialplan.', 3, () => { const gone = (s.removedNodes || []).concat([s.nodeId]); this.setState({ removedNodes:gone }); this.fire('Step deleted', 'It is off the canvas, with its connections.'); }); } },
            common[0], common[1]
          ]);
        }
        // The top menu bar used to just announce a menu name and open nothing. Every one
        // of the seven now opens this same overlay with real items -- reusing an action
        // this component can already perform genuinely, never inventing a new one.
        if (s.ctxKind === 'menubar') {
          if (s.ctxMenuId === 'File') return decorate([
            { icon:'save', label:'Save as a workspace', hint:'', run:() => { close(); this.hostAction('save', { bucket:'workspace', name:'Workspace', data:{ tabs:s.tabs, groups:s.groups } }); } },
            { icon:'restore', label:'Restore last session', hint:'', run:() => { close(); this.hostAction('restore', { bucket:'workspace' }); } },
            { icon:'download_for_offline', label:'Export all tabs', hint:'', run:() => { close(); this.hostAction('export-json', { name:'tabs', subject:'tabs and groups', data:{ tabs:s.tabs, groups:s.groups } }); } },
            { icon:'upload', label:'Import tabs…', hint:'', run:() => { close(); this.hostAction('import-json', { subject:'tabs' }); } }
          ]);
          if (s.ctxMenuId === 'Edit') return decorate([
            { icon:'content_copy', label:'Copy as configuration', hint:'⌃C', run:() => { close(); this.hostAction('copy-config', { what:'this configuration block' }); } },
            { icon:'data_object', label:'Open regex builder…', hint:'⌃R', run:() => this.setState({ ctxOpen:false, regexOpen:true, regexTarget:'nav', regexX:'300px', regexY:'120px' }) },
            { icon:'auto_fix_high', label:'Guided wizard for this screen', hint:'', run:() => this.setState({ ctxOpen:false, wizardOpen:true, wizardStep:0 }) },
            { icon:'checklist', label:'Select all rows', hint:'⌃A', run:() => { close(); this.set('selected', (sc.table ? sc.table.rows.map(r => r[0]) : [])); } }
          ]);
          if (s.ctxMenuId === 'View') return decorate([
            { icon:'dock_to_left', label:'Dock tabs left', hint:'', run:() => { close(); this.set('dock', 'left'); this.toast('Docked left'); } },
            { icon:'dock_to_right', label:'Dock tabs right', hint:'', run:() => { close(); this.set('dock', 'right'); this.toast('Docked right'); } },
            { icon:'vertical_align_top', label:'Dock tabs top', hint:'', run:() => { close(); this.set('dock', 'top'); this.toast('Docked top'); } },
            { icon:'vertical_align_bottom', label:'Dock tabs bottom', hint:'', run:() => { close(); this.set('dock', 'bottom'); this.toast('Docked bottom'); } },
            { icon:'fullscreen', label:'Full-screen dialplan editor', hint:'', run:() => { close(); this.setState(st => ({ rndNonce:st.rndNonce + 1, screen:'canvas', railId:SCREENS.canvas.rail, fullscreen:true })); this.toast('Full-screen editor — press the button again or Esc to exit'); } },
            { icon:'search', label:'Toggle command palette', hint:'⌃⇧F', run:() => { close(); this.set('paletteOpen', !s.paletteOpen); } }
          ]);
          if (s.ctxMenuId === 'PBX') return decorate(QUICK_ACTIONS.map(q => ({ icon:q.icon, label:q.label, hint:'', run:() => { close(); this.ceremony(q.label, q.cmd); } })));
          // "Agent" names the rail group two lines above (RAIL[4].label) rather than a
          // fresh guess at what the word means here: Memory console, Sync & attestation,
          // Skills registry, Status hub, Vocabulary & guard, Operations, Secret intake.
          if (s.ctxMenuId === 'Agent') return decorate(ORDER.filter(k => SCREENS[k].rail === 'agent').map(k => ({ icon:SCREENS[k].icon, label:SCREENS[k].label, hint:'', run:() => { close(); this.openScreen(k); } })));
          if (s.ctxMenuId === 'Window') return decorate([
            { icon:'add', label:'New tab here', hint:'⌃T', run:() => { close(); this.setState({ tabs:s.tabs.concat([s.screen]) }); } },
            { icon:'close', label:'Close tab', hint:'⌃W', run:() => { close(); const t = s.tabs.filter(x => x !== s.screen); this.setState({ tabs:t.length ? t : ['dash'], screen:t[0] || 'dash' }); } }
          ]);
          return decorate([
            { icon:'help', label:'Explain this screen…', hint:'F1', run:() => { close(); this.showInfo(sc.title, sc.sub, 'This screen edits ' + (sc.file || 'the console itself') + '. Every row you see is a real object in the running system, and every control writes one option.', '46%', '150px'); } },
            { icon:'menu_book', label:'Documentation', hint:'', run:() => { close(); this.openScreen('docs'); } },
            { icon:'new_releases', label:'What’s new', hint:'', run:() => { close(); this.openScreen('changelog'); } },
            { icon:'history', label:'Version history', hint:'', run:() => { close(); this.openScreen('history'); } },
            { icon:'notifications', label:'Notification centre', hint:'', run:() => { close(); this.openScreen('notifications'); } },
            { icon:'info', label:'About this console', hint:'', run:() => { close(); this.openScreen('about'); } }
          ]);
        }
        return decorate([
          { icon:'data_object', label:'Search this screen with regex…', hint:'⌃R', run:() => this.setState({ ctxOpen:false, regexOpen:true, regexTarget:'nav', regexX:s.ctxX, regexY:s.ctxY }) },
          { icon:'auto_fix_high', label:'Guided wizard for this screen', hint:'', run:() => this.setState({ ctxOpen:false, wizardOpen:true, wizardStep:0 }) },
          { icon:'checklist', label:'Select all rows', hint:'⌃A', run:() => { close(); this.set('selected', (sc.table ? sc.table.rows.map(r => r[0]) : [])); } },
          { icon:'add', label:'New tab here', hint:'⌃T', run:() => { close(); this.setState({ tabs:s.tabs.concat([s.screen]) }); } },
          { icon:'history', label:'Version history', hint:'', run:() => { close(); this.openScreen('history'); } },
          { icon:'notifications', label:'Notification centre', hint:'', run:() => { close(); this.openScreen('notifications'); } },
          { icon:'content_copy', label:'Copy as configuration', hint:'⌃C', run:() => { close(); this.hostAction('copy-config', { what:'this configuration block' }); } }
        ].concat(common));
      })(),

      lockChrome:this.dockChrome('lock', s.lockX, s.lockY, 392).style,
      lockDockOpts:this.dockChrome('lock', s.lockX, s.lockY, 392).options,
      lockFloating:this.dockChrome('lock', s.lockX, s.lockY, 392).floating,
      regexChrome:this.dockChrome('regex', s.regexX, s.regexY, 520).style,
      regexDockOpts:this.dockChrome('regex', s.regexX, s.regexY, 520).options,
      regexFloating:this.dockChrome('regex', s.regexX, s.regexY, 520).floating,
      infoChrome:this.dockChrome('info', s.infoX, s.infoY, 392).style,
      infoDockOpts:this.dockChrome('info', s.infoX, s.infoY, 392).options,
      lockOpen:s.lockOpen, lockTarget:s.lockTarget,
      lockX:this.pos('lock', s.lockX, s.lockY)[0], lockY:this.pos('lock', s.lockX, s.lockY)[1],
      dragLock:this.startDrag('lock'), dragRegex:this.startDrag('regex'), dragInfo:this.startDrag('info'),
      resizeLock:this.startResize('lock'), resizeRegex:this.startResize('regex'), resizeInfo:this.startResize('info'),
      resizeWizard:this.startResize('wizard'), resizeAppear:this.startResize('appear'),
      lockSteps:[0, 1, 2, 3].map(i => ({ bg:i <= s.lockStep ? '#82D9A5' : '#333B34' })),
      lockStepTitle:['Choose a method', s.lockMethod === 'PIN' ? 'Set a PIN' : 'Pair an authenticator', 'How long does it stay locked?', 'Disclosure and recovery'][s.lockStep],
      lockStepBody:['This credential belongs to this element alone. Locking something else later creates a separate credential, never a shared one.',
        'Six digits, entered on the pad. The PIN is stored for this element only.',
        'After this, the element locks itself again automatically.',
        'Read this before finishing. A toy lock is a speed bump, not a safe.'][s.lockStep],
      lockPickMethod:s.lockStep === 0,
      lockPin:s.lockStep === 1 && s.lockMethod.indexOf('PIN') >= 0,
      lockPassword:s.lockStep === 1 && s.lockMethod.indexOf('Password') >= 0,
      lockTotp:s.lockStep === 1 && s.lockMethod.indexOf('TOTP') >= 0,
      lockDuration:s.lockStep === 2, lockConfirm:s.lockStep === 3,
      lockMethods:[
        { label:'PIN only', icon:'pin', v:'PIN' },
        { label:'Password only', icon:'password', v:'Password' },
        { label:'PIN + one-time code', icon:'phonelink_lock', v:'PIN+TOTP' },
        { label:'Password + PIN', icon:'lock_person', v:'Password+PIN' },
        { label:'Password + one-time code', icon:'shield_lock', v:'Password+TOTP' },
        { label:'Password + PIN + one-time code', icon:'admin_panel_settings', v:'Password+PIN+TOTP' }
      ].map(m => ({ label:m.label, icon:m.icon, on:s.lockMethod === m.v, off:s.lockMethod !== m.v, pick:() => this.set('lockMethod', m.v) })),
      pinValue:s.pin,
      onPinInput:(e) => this.set('pin', (e.target.value || '').replace(/\D/g, '').slice(0, 6)),
      pinEyeIcon:s.pinReveal ? 'visibility_off' : 'visibility',
      pinReveal:() => this.set('pinReveal', !s.pinReveal),
      pwValue:s.password || '',
      pwInputType:s.pinReveal ? 'text' : 'password',
      onPwInput:(e) => this.set('password', e.target.value),
      pwPct:Math.min(100, (s.password || '').length * 9) + '%',
      pwColor:(s.password || '').length > 14 ? '#82D9A5' : ((s.password || '').length > 8 ? '#FFD68A' : '#FFB4AB'),
      pwLabel:(s.password || '').length > 14 ? 'strong' : ((s.password || '').length > 8 ? 'passable' : 'too short'),
      pwBuilders:[
        { icon:'casino', label:'Generate memorable', run:() => this.set('password', ['copper', 'lantern', 'quiet', 'harbour', 'ninety', 'velvet'].sort(() => Math.random() - 0.5).slice(0, 4).join('-')) },
        { icon:'shuffle', label:'Generate random', run:() => this.set('password', Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 8).toUpperCase()) },
        { icon:'add', label:'Add a word', run:() => this.set('password', (s.password ? s.password + '-' : '') + ['amber', 'signal', 'trunk', 'echo', 'relay'][Math.floor(Math.random() * 5)]) },
        { icon:'backspace', label:'Clear', run:() => this.set('password', '') }
      ],
      pinDots:Array.from({ length:6 }, (_, i) => ({ bg:i < s.pin.length ? '#82D9A5' : 'transparent' })),
      pinKeys:['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].map(k => ({ label:k, press:() => {
        if (k === '⌫') return this.setState(st => ({ pin:st.pin.slice(0, -1) }));
        if (k === '✓') return this.setState(st => ({ lockStep:st.pin.length >= 4 ? 2 : 1 }));
        this.setState(st => ({ pin:st.pin.length < 6 ? st.pin + k : st.pin }));
      } })),
      lockCtls:[ctl('lk_dur', 'Stays locked for', 'segmented', '15 minutes', { options:['5 minutes', '15 minutes', '1 hour', 'Until I unlock'] }), ctl('lk_hide', 'Hide the contents entirely', 'switch', true)].map(this.buildCtl),
      lockNextLabel:s.lockStep === 3 ? 'Lock it' : 'Next',
      lockBack:() => this.setState(st => ({ lockStep:Math.max(0, st.lockStep - 1) })),
      lockNext:() => {
        if (s.lockStep < 3) return this.set('lockStep', s.lockStep + 1);
        const needsPin = s.lockMethod.indexOf('PIN') >= 0;
        const needsPw = s.lockMethod.indexOf('Password') >= 0;
        if (needsPin && s.pin.length < 4) return this.toast('Set at least a four-digit PIN first');
        if (needsPw && (s.password || '').length < 4) return this.toast('Set a passphrase first');
        const L = Object.assign({}, s.locks);
        L[s.lockKey] = { method:s.lockMethod, pin:s.pin, password:s.password, target:s.lockTarget };
        this.setState({ locks:L, lockOpen:false });
        this.toast(s.lockTarget + ' is locked with ' + s.lockMethod + ' — the surface is now disabled');
      },
      closeLock:() => this.set('lockOpen', false),
      // No secret is generated anywhere in this flow -- the "QR" above is a static
      // checkerboard, and tryUnlock() never checks a TOTP code even when the chosen
      // method includes one. This button used to claim a pairing that could not have
      // happened. Real TOTP generation, a real QR and real verification are a standalone
      // feature (RFC 6238 secret + otpauth:// URI + code check); until that lands, this
      // says plainly that it has not.
      pairAuth:() => this.toast('Authenticator pairing is not built yet — nothing was paired, and this method will not verify a code'),

      appearOpen:s.appearOpen, appearTarget:s.appearTarget,
      appearChrome:this.dockChrome('appear', '38%', '90px', 468).style,
      appearDockOpts:this.dockChrome('appear', '38%', '90px', 468).options,
      dragAppear:this.startDrag('appear'),
      appearStates:APPEAR_STATES.map(t => ({ label:t, on:s.appearState === t, off:s.appearState !== t, pick:() => this.set('appearState', t) })),
      appearGroups:APPEAR_GROUPS.map(g => ({ icon:g.icon, title:g.title, ctls:g.ctls.map(this.buildCtl) })),
      appearPreviewStyle:'font-family:' + this.v('ap_family', 'Roboto') + ',sans-serif; font-weight:' + this.v('ap_weight', '500') + '; font-size:' + this.v('ap_size', 14) + 'px; letter-spacing:' + this.v('ap_track', 0) + 'px; line-height:' + this.v('ap_lead', 1.5) + '; text-transform:' + ({'As typed':'none','UPPER':'uppercase','lower':'lowercase','Title':'capitalize'}[this.v('ap_case','As typed')] || 'none') + '; font-variant-numeric:' + ({'Proportional':'proportional-nums','Tabular':'tabular-nums','Old style':'oldstyle-nums'}[this.v('ap_num','Proportional')] || 'normal') + '; text-decoration-line:' + ((this.v('ap_deco', []) || []).filter(d => d !== 'italic').join(' ') || 'none') + '; font-style:' + (((this.v('ap_deco', []) || []).indexOf('italic') >= 0) ? 'italic' : 'normal') + '; color:hsl(' + this.v('ap_hue', 148) + ' ' + this.v('ap_sat', 54) + '% ' + this.v('ap_light', 68) + '%); background:' + (function(f, hue, sat){ const tint = 'hsl(' + hue + ' ' + sat + '% 24%)'; if (f === 'None') return 'transparent'; if (f === 'Linear') return 'linear-gradient(135deg,' + tint + ',#141A15)'; if (f === 'Radial') return 'radial-gradient(circle at 30% 30%,' + tint + ',#141A15)'; if (f === 'Conic') return 'conic-gradient(from 0deg,' + tint + ',#141A15,' + tint + ')'; return '#141A15';})(this.v('ap_fill','Solid'), this.v('ap_hue',148), this.v('ap_sat',54)) + '; border:' + this.v('ap_bw', 1) + 'px ' + this.v('ap_bs', 'solid') + ' hsl(' + this.v('ap_hue', 148) + ' ' + this.v('ap_sat', 54) + '% 34%); border-radius:' + this.v('ap_r1', 12) + 'px ' + this.v('ap_r2', 12) + 'px ' + this.v('ap_r3', 12) + 'px ' + this.v('ap_r4', 12) + 'px; padding:' + this.v('ap_pt', 12) + 'px ' + this.v('ap_pr', 16) + 'px ' + this.v('ap_pb', 12) + 'px ' + this.v('ap_pl', 16) + 'px; box-shadow:' + (this.v('ap_sin', false) ? 'inset ' : '') + this.v('ap_sx', 0) + 'px ' + this.v('ap_sy', 4) + 'px ' + this.v('ap_sb', 14) + 'px ' + this.v('ap_ss', 0) + 'px rgba(0,0,0,' + (this.v('ap_sop', 45) / 100) + '); filter:blur(' + this.v('ap_blur', 0) + 'px) brightness(' + this.v('ap_bright', 100) + '%) contrast(' + this.v('ap_contrast', 100) + '%) saturate(' + this.v('ap_satf', 100) + '%) hue-rotate(' + this.v('ap_hrot', 0) + 'deg) grayscale(' + this.v('ap_grey', 0) + '%); opacity:' + (this.v('ap_alpha', 100) / 100) + '; transform:translate(' + this.v('ap_tx', 0) + 'px,' + this.v('ap_ty', 0) + 'px) scale(' + (this.v('ap_scale', 100) / 100) + ') rotate(' + this.v('ap_rot', 0) + 'deg) skew(' + this.v('ap_skew', 0) + 'deg)' + '; mix-blend-mode:' + this.v('ap_blend','normal') + '; transition:all ' + this.v('ap_transition',180) + 'ms ease;' + (function(on, hue, rbsat, rblight, range, ease, dir, speed, hrot, blur, bright, contrast, satf, grey, fill){ if (!on) return ''; var reduced = (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); var tint = 'hsl(' + hue + ' ' + rbsat + '% ' + rblight + '%)'; var bg = (fill === 'None') ? 'transparent' : (fill === 'Linear') ? ('linear-gradient(135deg,' + tint + ',#141A15)') : (fill === 'Radial') ? ('radial-gradient(circle at 30% 30%,' + tint + ',#141A15)') : (fill === 'Conic') ? ('conic-gradient(from 0deg,' + tint + ',#141A15,' + tint + ')') : tint; var from = hrot, to = hrot + range, mid = hrot + range / 2; var easing = ({'linear':'linear','ease-in-out':'ease-in-out','steps':'steps(12,end)'})[ease] || 'linear'; var direction = ({'Forward':'normal','Reverse':'reverse','Ping-pong':'alternate'})[dir] || 'normal'; var baseFilter = 'blur(' + blur + 'px) brightness(' + bright + '%) contrast(' + contrast + '%) saturate(' + satf + '%) grayscale(' + grey + '%)'; return '; background:' + bg + ';' + (reduced   ? (' filter:' + baseFilter + ' hue-rotate(' + mid + 'deg);')   : (' --rb-base:' + baseFilter + '; --rb-from:' + from + 'deg; --rb-to:' + to + 'deg; animation:m3RainbowFill ' + speed + 's ' + easing + ' infinite ' + direction + ';')); })(this.v('ap_rainbow', false), this.v('ap_hue', 148), this.v('ap_rbsat', 62), this.v('ap_rblight', 66), this.v('ap_rbrange', 360), this.v('ap_rbease', 'linear'), this.v('ap_rbdir', 'Forward'), this.v('ap_rbspeed', 6), this.v('ap_hrot', 0), this.v('ap_blur', 0), this.v('ap_bright', 100), this.v('ap_contrast', 100), this.v('ap_satf', 100), this.v('ap_grey', 0), this.v('ap_fill', 'Solid')),
      colorValue:'hsl(' + this.v('ap_hue', 148) + ' ' + this.v('ap_sat', 54) + '% ' + this.v('ap_light', 68) + '%)',
      hueStops:Array.from({ length:24 }, (_, i) => { const h = Math.round(i * 360 / 24); return { color:'hsl(' + h + ' 70% 55%)', label:h + '°', pick:() => this.setVal({ id:'ap_hue', label:'Hue' }, h) }; }),
      shadeStops:Array.from({ length:14 }, (_, i) => { const l = 6 + i * 6.8; return { color:'hsl(' + this.v('ap_hue', 148) + ' ' + this.v('ap_sat', 54) + '% ' + Math.round(l) + '%)', pick:() => this.setVal({ id:'ap_light', label:'Lightness' }, Math.round(l)) }; }),
      colorActions:[
        { icon:'casino', label:'Surprise me', run:() => { this.setVal({ id:'ap_hue', label:'Hue' }, Math.floor(Math.random() * 360)); this.fire('Bold choice', 'Nobody will ever say it is boring.'); } },
        { icon:'gradient', label:'Rainbow it', run:() => this.setVal({ id:'ap_rainbow', label:'Rainbow fill', kind:'switch' }, true) },
        { icon:'contrast', label:'Fix contrast', run:() => { this.setVal({ id:'ap_light', label:'Lightness' }, 72); this.toast('Lightness raised to meet contrast against the surface'); } },
        { icon:'colorize', label:'Pick from screen', run:() => this.hostAction('pick-colour', {}) }
      ],
      colorFormats:(() => { const h = this.v('ap_hue', 148), sa = this.v('ap_sat', 54), l = this.v('ap_light', 68);
        return [['hsl', 'hsl(' + h + ' ' + sa + '% ' + l + '%)'], ['oklch', 'oklch(' + (l / 100).toFixed(2) + ' 0.12 ' + h + ')'], ['hex', '#' + Math.floor(h * 0.7).toString(16).padStart(2, '0') + Math.floor(sa * 2.4).toString(16).padStart(2, '0') + Math.floor(l * 2.4).toString(16).padStart(2, '0')], ['css var', '--accent']]
          // Same real hostAction('copy', ...) write as the tab-accent picker above, in
          // place of a toast that claimed a copy that never reached the clipboard.
          .map(([k, val]) => ({ label:k + ' · ' + val, copy:() => this.hostAction('copy', { what:k, text:val }) })); })(),
      appearActions:[
        { icon:'casino', label:'Randomise this element', run:() => this.randomAppearance(false) },
        { icon:'shuffle', label:'Randomise every element', run:() => this.randomAppearance(true) },
        { icon:'restart_alt', label:'Reset', run:() => { this.setState({ values:{} }); this.toast('Appearance reset to the design system'); } },
        { icon:'bookmark_add', label:'Save preset', run:() => this.hostAction('save', { bucket:'appearance-preset', name:'Appearance preset' }) },
        { icon:'download', label:'Export', run:() => this.hostAction('export-json', { subject:'appearance', name:'appearance', data:v.appearValues || s.values }) },
        { icon:'upload', label:'Import', run:() => this.hostAction('import-json', { subject:'appearance' }) }
      ],
      closeAppear:() => this.set('appearOpen', false),

      celebrate:s.celebrate, celebrateTitle:s.celebrateTitle, celebrateSub:s.celebrateSub,
      confetti:Array.from({ length:90 }, (_, i) => ({
        x:((i * 17 + (i % 5) * 7) % 100) + '%', size:(10 + (i % 5) * 6) + 'px',
        color:['#82D9A5', '#9FF7C4', '#FFD68A', '#FFB4AB', '#DFE4DC', '#5AC8FA', '#FF8AD8'][i % 7],
        radius:i % 3 === 0 ? '50%' : (i % 3 === 1 ? '3px' : '0'),
        dur:(1.5 + (i % 6) * 0.28) + 's', delay:((i % 11) * 0.06) + 's'
      })),

      hasDoc:!!s.infoDoc, infoKey:s.infoKey,
      playCtl:(this._lastCtl ? [Object.assign(this.buildCtl(Object.assign({}, this._lastCtl, { id:'play_' + this._lastCtl.id })), { narrow:(this._lastCtl.options || []).length > 2 })] : []),
      simRun:() => this.setState(st => ({ simTick:(st.simTick || 0) + 1 })),
      simSteps:this.simulate(),
      simVerdict:this.simVerdict().text,
      simVerdictColour:this.simVerdict().colour,
      simVerdictIcon:this.simVerdict().icon,
      simWire:this.simWire(),
      docSpec:(s.infoDoc ? s.infoDoc.spec : []),
      docWhy:(s.infoDoc ? (s.infoDoc.why || s.infoDoc.whenToChange) : ''),
      docValues:(s.infoDoc ? (s.infoDoc.valuesText || 'The accepted values are listed in the reference above.') : ''),
      docGotcha:(s.infoDoc ? (s.infoDoc.gotcha || 'Nothing surprising. Change it, watch one call, change it back if it was wrong.') : ''),
      docWizard:() => { const c = s.infoDoc; this.setState({ infoOpen:false }); if (this._lastCtl) this.openCtlWizard(this._lastCtl); },
      infoOpen:s.infoOpen, infoTitle:s.infoTitle, infoBody:s.infoBody, infoPlain:s.infoPlain,
      infoX:s.infoX, infoY:s.infoY, infoDiagram:'diagram slot — drop a real screenshot or schematic here',
      closeInfo:() => this.set('infoOpen', false),

      wizardOpen:s.wizardOpen,
      wizardChrome:this.dockChrome('wizard', '46%', '96px', 432).style,
      wizardDockOpts:this.dockChrome('wizard', '46%', '96px', 432).options,
      dragWizard:this.startDrag('wizard'),
      wizardTitle:s.wizardCtl ? s.wizardCtl.label : sc.title,
      wizardFlowName:s.wizardCtl ? ('guided walkthrough · ' + s.wizardCtl.id) : (flow.length + '-step guided setup'),
      wizardSteps:flow.map((st, i) => ({ label:st.label, bg:i <= wizStep ? '#82D9A5' : '#333B34' })),
      wizardRail:flow.map((st, i) => ({
        label:st.label, num:String(i + 1),
        done:i < wizStep, current:i === wizStep, todo:i > wizStep,
        go:() => this.set('wizardStep', i)
      })),
      wizardCounter:'Step ' + (wizStep + 1) + ' of ' + flow.length,
      wizardStepTitle:cur.t, wizardStepBody:cur.b, wizardWhy:cur.why,
      wizardWarn:cur.warn, hasWarn:!!cur.warn,
      wizardCtls:cur.ctls.map(this.buildCtl),
      wizardPreview:this.wizardPreview(),
      wizardNextLabel:last ? 'Apply with confirmation' : 'Next',
      // Finishing the wizard used to run `pjsip reload` and nothing else: it collected
      // every answer and then reloaded a file it had never written to, reporting success.
      // A screen that can actually create the thing it asked about supplies its own
      // handler, the way the servers screen already does.
      wizardNext:() => { if (last) { this.setState({ wizardOpen:false });
        if (this.state.screen === 'endpoints' && this.onCreateEndpoint) { this.onCreateEndpoint(); return; }
        this.ceremony('Apply guided configuration', this.state.screen === 'servers' ? 'connect ' + (this.val({ id:'sv_kind', value:'Local' })) : 'pjsip reload'); } else this.setState(st => ({ wizardStep:Math.min(flow.length - 1, st.wizardStep + 1) })); },
      wizardBack:() => this.setState(st => ({ wizardStep:Math.max(0, st.wizardStep - 1) })),
      closeWizard:() => this.setState({ wizardOpen:false, wizardCtl:null }),

      paletteOpen:s.paletteOpen,
      paletteItems:ORDER.map(k => ({ icon:SCREENS[k].icon, label:SCREENS[k].title, hint:SCREENS[k].file || 'console', go:() => { this.setState({ paletteOpen:false }); this.openScreen(k); } })),

      ceremonyOpen:s.ceremonyOpen, ceremonyTitle:s.ceremonyTitle, ceremonyCmd:s.ceremonyCmd,
      ceremonySteps:['Operator key', 'Arming switch', 'Slide to commit', 'Attention check'].map((l, i) => ({ label:l, bg:i <= s.cStep ? '#82D9A5' : '#333B34', fg:i <= s.cStep ? '#9FF7C4' : '#778078' })),
      cKey:s.cStep === 0, cSwitch:s.cStep === 1, cSlide:s.cStep === 2, cMole:s.cStep === 3, cDone:s.cStep === 4,
      keyAngle:s.keyTurned ? '90deg' : '0deg',
      keyStatus:s.keyTurned ? 'key turned · advancing' : 'key at rest',
      turnKey:() => { this.set('keyTurned', true); setTimeout(() => this.setState({ cStep:1 }), 450); },
      holdPct:Math.min(100, s.holdMs / 20) + '%',
      holdStatus:s.holdMs >= 2000 ? 'armed' : (s.holdMs > 0 ? 'holding…' : 'not armed'),
      holdStart:() => { clearInterval(this._hold); this._hold = setInterval(() => { const n = this.state.holdMs + 100; if (n >= 2000) { clearInterval(this._hold); this.setState({ holdMs:2000, cStep:2 }); } else this.setState({ holdMs:n }); }, 100); },
      holdEnd:() => { clearInterval(this._hold); if (this.state.holdMs < 2000) this.set('holdMs', 0); },
      slideVal:s.slideVal,
      slideStatus:s.slideVal >= 100 ? 'committed' : 'slide all the way right',
      onSlide:(e) => { const v = Number(e.target.value); if (v >= 100) { this.setState({ slideVal:100, cStep:3 }); this.startMoles(); } else this.set('slideVal', v); },
      moleHits:s.moleHits + ' / 5',
      moleTime:s.moleTime + 's left',
      moleCells:Array.from({ length:12 }, (_, i) => ({ up:i === s.moleIdx, down:i !== s.moleIdx, whack:() => { const h = this.state.moleHits + 1; if (h >= 5) { clearInterval(this._mole); this.setState({ moleHits:h, cStep:4, moleIdx:-1 }); } else this.setState({ moleHits:h, moleIdx:Math.floor(Math.random() * 12) }); } })),
      sureOpen:s.sureOpen, sureTitle:s.sureTitle, sureBody:s.sureBody,
      sureProgress:s.sureHits + ' / ' + s.sureNeed,
      sureReady:s.sureHits >= s.sureNeed, sureLocked:s.sureHits < s.sureNeed,
      sureCells:Array.from({ length:8 }, (_, i) => ({ up:i === s.sureCell, down:i !== s.sureCell,
        hit:() => { const h = this.state.sureHits + 1; this.setState({ sureHits:h, sureCell:h >= this.state.sureNeed ? -1 : Math.floor(Math.random() * 8) }); if (h >= this.state.sureNeed) this.toast('Yes unlocked — you are demonstrably awake'); } })),
      closeSure:() => this.setState({ sureOpen:false, sureHits:0, sureCell:-1 }),
      sureYes:() => { const act = this.state.sureAction; this.setState({ sureOpen:false, sureHits:0, sureCell:-1 }); if (act) act(); },
      canSkip:s.credits > 0 && s.cStep < 4 && this.v('cr_enable', true),
      skipCeremony:() => { clearInterval(this._mole); clearInterval(this._hold); this.setState({ credits:s.credits - 1, ceremonyOpen:false }); this.fire('Skipped', s.ceremonyCmd + ' ran on a credit. ' + (s.credits - 1) + ' left.'); },
      goArcade:() => this.setState({ railId:'app', screen:'arcade' }),
      cancelCeremony:() => { clearInterval(this._mole); clearInterval(this._hold); this.set('ceremonyOpen', false); },
      executeCeremony:() => { clearInterval(this._mole); this.setState({ ceremonyOpen:false }); this.toast(s.ceremonyCmd + ' executed and attested'); },

      onboardFirst:s.onboardStep === 0,
      onboardOpen:s.onboardOpen, onboardIcon:ob.icon, onboardTitle:ob.t, onboardBody:ob.b,
      onboardSteps:ONBOARD.map((o, i) => ({ label:['Start', 'Basics', 'Target', 'Safety', 'Deploy'][i], bg:i <= s.onboardStep ? '#82D9A5' : '#333B34', fg:i <= s.onboardStep ? '#9FF7C4' : '#778078' })),
      onboardCtls:ob.ctls.map(this.buildCtl),
      onboardNextLabel:s.onboardStep === ONBOARD.length - 1 ? 'Deploy it all now' : 'Next',
      easyMode:this.v('ob_ease', 'Super easy') === 'Super easy',
      notEasy:this.v('ob_ease', 'Super easy') !== 'Super easy',
      modeTitle:this.v('ob_ease', 'Super easy') === 'Guided' ? 'Guided — the questions that actually change something' : 'Every detail — nothing is chosen for you',
      modeBody:this.v('ob_ease', 'Super easy') === 'Guided' ? 'You answer the handful of questions that change how the system behaves, and settled defaults cover the rest. Press Next to begin; you can go back at any point.' : 'Every question is asked, including the ones most people never need, and nothing is filled in on your behalf. Press Next to begin.',
      superEasy:() => { this.setState(st => ({ values:Object.assign({}, st.values, { ob_intent:'Deploy a new server', ob_ease:'Super easy', ob_phones:8, ob_menu:true, ob_hours:true, ob_tls:true }), onboardOpen:false, screen:'servers', railId:'app', oneClickMode:'Funny' })); this.fire('Super easy mode', 'Three defaults taken. Press the big button and walk away.'); },
      onboardNext:() => this.setState(st => (st.onboardStep >= ONBOARD.length - 1
        ? { onboardOpen:false, tourOpen:st.values.ob_tour !== false, tourStep:0, screen:'servers', railId:'app' }
        : { onboardStep:st.onboardStep + 1 })),
      onboardBack:() => this.setState(st => ({ onboardStep:Math.max(0, st.onboardStep - 1) })),
      skipOnboard:() => this.setState({ onboardOpen:false, tourOpen:false }),

      tourOpen:s.tourOpen, tourTitle:TOUR[s.tourStep].t, tourBody:TOUR[s.tourStep].b,
      tourX:TOUR[s.tourStep].x, tourY:TOUR[s.tourStep].y,
      tourCount:(s.tourStep + 1) + ' of ' + TOUR.length,
      tourNext:() => { if (s.tourStep === TOUR.length - 1) this.set('tourOpen', false); else this.set('tourStep', s.tourStep + 1); },
      endTour:() => this.set('tourOpen', false),

      toastOpen:s.toastOpen, toastText:s.toastText,
      undoToast:() => { this.setState({ toastOpen:false }); this.toast('Change reverted'); }
    };
  }
}
ConsoleShell.prototype.template = Template;
export default ConsoleShell;

export { RAIL, SCREENS, ORDER, DOCS, GAMES, NODES, EDGES, WIZARDS, ONBOARD, TOUR, CLI_STEPS, APPEAR_GROUPS, ADVANCED };

