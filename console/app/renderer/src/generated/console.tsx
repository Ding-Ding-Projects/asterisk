// @ts-nocheck
/* GENERATED FILE — do not edit.
 * Produced by console/scripts/compile-design.mjs from the checked-in design reference.
 * Edit the design reference and recompile instead. */
import { DCLogic, h, F, A, R, S, fn, sty } from '../dc-runtime';
import M3Control from './m3-control';
function Template(v: any) {
  return F(
    h("div", { style: sty(`height:100vh; display:flex; flex-direction:column; background:#0B0F0C; color:#DFE4DC; font-family:Roboto,system-ui,sans-serif; font-size:14px; overflow:hidden; position:relative;`) },
      h("div", { "data-attention-titlebar": `true`, style: sty(`height:40px; flex:0 0 40px; display:flex; align-items:stretch; background:#141A15; user-select:none; overflow:hidden; min-width:0;`), "data-window-drag": `` },
        h("div", { style: sty(`display:flex; align-items:center; gap:10px; padding:0 12px; flex:0 0 auto; white-space:nowrap;`) },
          h("span", { style: sty(`font-size:20px; color:#82D9A5; flex:0 0 auto;`), className: "msym" },
            "deployed_code"
          ),
          h("span", { "data-shell-title": ``, style: sty(`font-size:13px; font-weight:500; letter-spacing:.1px; white-space:nowrap; flex:0 0 auto;`) },
            "Ding PBX Console"
          )
        ),
        h("div", { style: sty(`display:flex; align-items:center; min-width:0; flex:0 1 auto; padding:0 10px; color:#8FA394; font-size:12px;`) },
          S(v.shellCapabilitySummary)
        ),
        h("div", { style: sty(`flex:1 1 0; min-width:0; display:flex; align-items:center; justify-content:center; overflow:hidden;`) },
          h("button", { onClick: fn(v.openConnection), "aria-disabled": v.connectionDisabled, title: v.connectionReason, style: sty(`display:flex; align-items:center; gap:8px; background:#1B211C; border:1px solid #414942; border-radius:999px; padding:5px 14px 5px 10px; color:#C4CBC2; font:inherit; font-size:12px; cursor:pointer; white-space:nowrap; flex:0 1 auto; min-width:0; overflow:hidden; height:28px;`), className: "k-h0" },
            h("span", { style: sty(`width:8px; height:8px; border-radius:50%; background:${S(v.connectionColour)}; flex:0 0 auto;`) }),
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
              ($o.off ? h("button", { onClick: fn($o.pick), style: sty(`background:transparent; color:#9AA39B; border:0; padding:0 13px; font:inherit; font-size:12px; cursor:pointer;`), className: "k-h1" },
                  S($o.label)
                ) : null)
            )))
          ),
          h("button", { onClick: fn(v.togglePalette), title: `Command palette (Ctrl+Shift+F)`, style: sty(`width:32px; height:32px; border-radius:50%; background:transparent; border:0; color:#9AA39B; cursor:pointer; display:flex; align-items:center; justify-content:center;`), className: "k-h2" },
            h("span", { style: sty(`font-size:19px;`), className: "msym" },
              "search"
            )
          ),
          h("div", { style: sty(`display:flex; align-items:center; gap:4px; padding-left:4px;`) },
            h("div", { title: `Minimize`, style: sty(`width:28px; height:28px; display:flex; align-items:center; justify-content:center;`), onClick: fn(v.__window?.minimize), "data-window-button": `` },
              h("span", { className: "msym" },
                "remove"
              )
            ),
            h("div", { title: `Maximize`, style: sty(`width:28px; height:28px; display:flex; align-items:center; justify-content:center;`), onClick: fn(v.__window?.toggleMaximize), "data-window-button": `` },
              h("span", { className: "msym" },
                "crop_square"
              )
            ),
            h("div", { title: `Close`, style: sty(`width:28px; height:28px; display:flex; align-items:center; justify-content:center;`), onClick: fn(v.__window?.close), "data-window-button": `` },
              h("span", { className: "msym" },
                "close"
              )
            )
          )
        )
      ),
      h("div", { "data-tab-strip": ``, role: `tablist`, "aria-label": `Open console tabs`, "aria-orientation": v.tabOrientation, onKeyDown: v.onTabListKeyDown, style: sty(`${S(v.tabStripStyle)}`) },
        A(v.tabGroups).map(($g, $g$i) => R($g$i, h("div", { role: `group`, "aria-label": $g.name, "aria-expanded": $g.expanded, onClick: fn($g.toggle), onContextMenu: fn($g.ctx), style: sty(`display:flex; align-items:center; gap:7px; animation:tabIn .24s cubic-bezier(.2,1.3,.4,1); background:${S($g.bg)}; border-radius:10px; padding:8px 12px; margin-bottom:0; cursor:pointer; flex:0 0 auto; border-top:2px solid ${S($g.colour)};`) },
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
          ($t.on ? h("div", { role: `tab`, "aria-selected": `true`, "aria-controls": `console-panel`, tabIndex: `0`, draggable: `true`, onDragStart: fn($t.onDragStart), onDragOver: fn($t.onDragOver), onDrop: fn($t.onDrop), onDragEnd: fn($t.onDragEnd), onClick: fn($t.go), onContextMenu: fn($t.ctx), style: sty(`display:flex; align-items:center; gap:8px; background:#141A15; border-radius:10px; padding:8px 10px 8px 13px; cursor:grab; animation:tabIn .22s cubic-bezier(.2,1.3,.4,1); max-width:230px; min-width:130px; border-top:2px solid #82D9A5; border-left:2px solid ${S($t.edge)}; border-right:2px solid ${S($t.edge)};`) },
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
              ($t.closable ? h("button", { onClick: fn($t.close), "aria-label": `Close ${S($t.label)}`, style: sty(`width:20px; height:20px; border-radius:50%; background:transparent; border:0; color:#9AA39B; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto;`), className: "k-h3" },
                  h("span", { style: sty(`font-size:14px;`), className: "msym" },
                    "close"
                  )
                ) : null)
            ) : null),
          ($t.off ? h("div", { role: `tab`, "aria-selected": `false`, "aria-controls": `console-panel`, tabIndex: `-1`, draggable: `true`, onDragStart: fn($t.onDragStart), onDragOver: fn($t.onDragOver), onDrop: fn($t.onDrop), onDragEnd: fn($t.onDragEnd), onClick: fn($t.go), onContextMenu: fn($t.ctx), style: sty(`display:flex; align-items:center; gap:8px; background:#0F1510; border-radius:10px; padding:8px 10px 8px 13px; cursor:grab; animation:tabIn .22s cubic-bezier(.2,1.3,.4,1); max-width:200px; min-width:110px; border-top:2px solid transparent; border-left:2px solid ${S($t.edge)}; border-right:2px solid ${S($t.edge)};`), className: "k-h4" },
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
              ($t.closable ? h("button", { onClick: fn($t.close), "aria-label": `Close ${S($t.label)}`, style: sty(`width:20px; height:20px; border-radius:50%; background:transparent; border:0; color:#778078; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto;`), className: "k-h3" },
                  h("span", { style: sty(`font-size:14px;`), className: "msym" },
                    "close"
                  )
                ) : null)
            ) : null)
        ))),
        h("button", { onClick: fn(v.newTab), title: `New tab`, style: sty(`width:30px; height:30px; margin-bottom:3px; border-radius:8px; background:transparent; border:0; color:#9AA39B; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto;`), className: "k-h5" },
          h("span", { style: sty(`font-size:18px;`), className: "msym" },
            "add"
          )
        ),
        h("div", { style: sty(`flex:1;`) }),
        h("div", { style: sty(`display:flex; align-items:center; gap:4px; padding-bottom:4px;`) },
          h("span", { style: sty(`font-size:11px; color:#778078;`) },
            "Tab strip"
          ),
          A(v.dockOpts).map(($d, $d$i) => R($d$i, F(
            ($d.on ? h("button", { onClick: fn($d.pick), title: $d.label, style: sty(`width:26px; height:26px; border-radius:7px; background:#005230; border:0; color:#9FF7C4; cursor:pointer; display:flex; align-items:center; justify-content:center;`) },
                h("span", { style: sty(`font-size:16px;`), className: "msym" },
                  S($d.icon)
                )
              ) : null),
            ($d.off ? h("button", { onClick: fn($d.pick), title: $d.label, style: sty(`width:26px; height:26px; border-radius:7px; background:transparent; border:0; color:#778078; cursor:pointer; display:flex; align-items:center; justify-content:center;`), className: "k-h6" },
                h("span", { style: sty(`font-size:16px;`), className: "msym" },
                  S($d.icon)
                )
              ) : null)
          ))),
          A(v.tabSearchSlots).map(($q, $q$i) => R($q$i, h("div", { role: `search`, "aria-label": $q.label, style: sty(`display:flex; align-items:center; gap:4px; background:#141A15; border:1px solid #333B34; border-radius:10px; padding:2px 5px;`) },
              h("input", { type: `search`, value: $q.value, onInput: fn($q.input), placeholder: $q.label, "aria-label": $q.label, style: sty(`width:112px; background:transparent; border:0; color:#DFE4DC; font:inherit; font-size:11px;`) }),
              h("button", { onClick: fn($q.regex), "aria-label": `Open regex builder for ${S($q.label)}`, style: sty(`background:transparent; border:0; color:#82D9A5; cursor:pointer;`) },
                h("span", { className: "msym" },
                  "data_object"
                )
              )
            )))
        )
      ),
      h("div", { "data-shell-content": ``, id: `console-panel`, role: `tabpanel`, style: sty(`${S(v.workspaceInsetStyle)}`) },
        h("div", { "data-attention-rail": `true`, style: sty(`width:88px; flex:0 0 88px; background:#0B0F0C; display:flex; flex-direction:column; align-items:center; padding:8px 0 12px; gap:4px; overflow-y:auto;`) },
          A(v.rail).map(($r, $r$i) => R($r$i, h("button", { onClick: fn($r.pick), style: sty(`width:100%; background:transparent; border:0; cursor:pointer; padding:4px 0 2px; display:flex; flex-direction:column; align-items:center; gap:4px;`) },
              ($r.on ? h("span", { style: sty(`width:56px; height:32px; border-radius:16px; background:#005230; display:flex; align-items:center; justify-content:center; animation:m3Ripple .5s ease-out;`) },
                  h("span", { style: sty(`font-size:22px; color:#9FF7C4;`), className: "msym" },
                    S($r.icon)
                  )
                ) : null),
              ($r.off ? h("span", { style: sty(`width:56px; height:32px; border-radius:16px; background:transparent; display:flex; align-items:center; justify-content:center;`), className: "k-h7" },
                  h("span", { style: sty(`font-size:22px; color:#B6BEB5;`), className: "msym" },
                    S($r.icon)
                  )
                ) : null),
              h("span", { style: sty(`font-size:11px; font-weight:500; letter-spacing:.3px; color:#C4CBC2;`) },
                S($r.label)
              )
            ))),
          h("div", { style: sty(`flex:1;`) }),
          h("button", { onClick: fn(v.startOnboarding), title: `Re-run setup`, style: sty(`width:56px; height:56px; border-radius:18px; background:#1B4D33; border:0; color:#9FF7C4; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,.4);`), className: "k-h8" },
            h("span", { style: sty(`font-size:24px;`), className: "msym" },
              "rocket_launch"
            )
          )
        ),
        h("div", { "data-attention-section-list": `true`, style: sty(`width:268px; flex:0 0 268px; background:#141A15; border-radius:16px 0 0 0; display:flex; flex-direction:column; min-height:0;`) },
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
              h("button", { onClick: fn(v.openNavRegex), title: `Regex builder`, style: sty(`width:26px; height:26px; border-radius:50%; background:#262B26; border:0; color:#82D9A5; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto;`), className: "k-h9" },
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
              ($s.off ? h("button", { onClick: fn($s.pick), style: sty(`width:100%; text-align:left; background:transparent; border:0; border-radius:999px; padding:9px 14px; margin-bottom:3px; cursor:pointer; display:flex; align-items:center; gap:11px;`), className: "k-h7" },
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
        h("div", { "data-attention-work-region": `true`, style: sty(`flex:1; min-width:0; display:flex; flex-direction:column; background:#0F1510;`) },
          h("div", { "data-attention-card-mount": `true` }),
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
              h("button", { onClick: fn(v.openInfoScreen), style: sty(`background:transparent; border:1px solid #414942; border-radius:999px; color:#C4CBC2; font:inherit; font-size:13px; font-weight:500; padding:9px 16px 9px 12px; cursor:pointer; display:flex; align-items:center; gap:7px;`), className: "k-h7" },
                h("span", { style: sty(`font-size:18px; color:#82D9A5;`), className: "msym" },
                  "help"
                ),
                "Explain"
              ),
              h("button", { onClick: fn(v.openWizard), style: sty(`background:#82D9A5; border:0; border-radius:999px; color:#00391F; font:inherit; font-size:13px; font-weight:500; padding:10px 20px 10px 15px; cursor:pointer; display:flex; align-items:center; gap:7px;`), className: "k-h10" },
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
                      S(v.dashboardRefresh)
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
                          h("button", { onClick: fn($c.spy), title: `Listen (ChanSpy)`, style: sty(`width:28px; height:28px; border-radius:50%; background:#262B26; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h11" },
                            h("span", { style: sty(`font-size:16px;`), className: "msym" },
                              "hearing"
                            )
                          ),
                          h("button", { onClick: fn($c.rec), title: `MixMonitor`, style: sty(`width:28px; height:28px; border-radius:50%; background:#262B26; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h11" },
                            h("span", { style: sty(`font-size:16px;`), className: "msym" },
                              "fiber_manual_record"
                            )
                          ),
                          h("button", { onClick: fn($c.kill), title: `Hangup`, style: sty(`width:28px; height:28px; border-radius:50%; background:#262B26; border:0; color:#FFB4AB; cursor:pointer;`), className: "k-h12" },
                            h("span", { style: sty(`font-size:16px;`), className: "msym" },
                              "call_end"
                            )
                          )
                        )
                      )))
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
                        )))
                    )
                  ),
                  h("div", { style: sty(`background:#1B211C; border-radius:16px; padding:16px 18px; flex:1;`) },
                    h("div", { style: sty(`font-size:15px; font-weight:500; margin-bottom:10px;`) },
                      "Quick actions"
                    ),
                    h("div", { style: sty(`display:flex; flex-wrap:wrap; gap:8px;`) },
                      A(v.quickActions).map(($q, $q$i) => R($q$i, h("button", { onClick: fn($q.run), style: sty(`display:flex; align-items:center; gap:6px; background:#262B26; border:0; border-radius:999px; padding:8px 14px 8px 11px; color:#C4CBC2; font:inherit; font-size:12.5px; cursor:pointer;`), className: "k-h11" },
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
                    ($l.off ? h("button", { onClick: fn($l.pick), style: sty(`flex:1; min-width:150px; text-align:left; background:rgba(0,0,0,.24); border:1px solid rgba(159,247,196,.3); border-radius:16px; padding:13px 15px; cursor:pointer;`), className: "k-h13" },
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
                  h("button", { onClick: fn(v.rerollNow), style: sty(`display:flex; align-items:center; gap:7px; background:rgba(0,0,0,.24); border:1px solid rgba(159,247,196,.3); border-radius:999px; padding:11px 20px 11px 15px; color:#9FF7C4; font:inherit; font-size:13px; font-weight:500; cursor:pointer;`), className: "k-h13" },
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
                  ($b.off ? h("button", { onClick: fn($b.pick), style: sty(`background:transparent; border:1px solid #414942; border-radius:999px; padding:7px 14px; color:#C4CBC2; font-family:'Roboto Mono',monospace; font-size:12px; cursor:pointer;`), className: "k-h0" },
                      S($b.label)
                    ) : null)
                ))),
                h("div", { style: sty(`flex:1;`) }),
                A(v.histActions).map(($a, $a$i) => R($a$i, h("button", { onClick: fn($a.run), style: sty(`display:flex; align-items:center; gap:6px; background:#1B211C; border:0; border-radius:999px; padding:8px 14px 8px 11px; color:#C4CBC2; font:inherit; font-size:12.5px; cursor:pointer;`), className: "k-h11" },
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
                      ($f.off ? h("button", { onClick: fn($f.pick), style: sty(`background:transparent; border:1px solid #414942; border-radius:8px; padding:5px 11px; color:#9AA39B; font:inherit; font-size:11.5px; cursor:pointer;`), className: "k-h14" },
                          S($f.label)
                        ) : null)
                    )))
                  ),
                  h("div", { style: sty(`max-height:460px; overflow-y:auto;`) },
                    A(v.commitRows).map(($c, $c$i) => R($c$i, h("div", { onClick: fn($c.pick), onContextMenu: fn($c.ctx), style: sty(`display:flex; align-items:flex-start; gap:12px; padding:11px 16px; border-top:1px solid #262B26; cursor:pointer; background:${S($c.bg)}; animation:m3Slide .28s cubic-bezier(.2,0,0,1) both;`), className: "k-h15" },
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
                        h("button", { onClick: fn($c.compare), title: `Add to comparison`, style: sty(`width:26px; height:26px; border-radius:50%; background:transparent; border:1px solid #414942; color:${S($c.cmpFg)}; cursor:pointer; flex:0 0 auto;`), className: "k-h16" },
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
                      A(v.diffActions).map(($a, $a$i) => R($a$i, h("button", { onClick: fn($a.run), style: sty(`display:flex; align-items:center; gap:6px; background:${S($a.bg)}; border:0; border-radius:999px; padding:9px 15px 9px 12px; color:${S($a.fg)}; font:inherit; font-size:12.5px; font-weight:500; cursor:pointer;`) },
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
                          h("button", { onClick: fn($a.yes), style: sty(`display:flex; align-items:center; gap:7px; background:#82D9A5; border:0; border-radius:999px; padding:10px 22px 10px 16px; color:#00391F; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`), className: "k-h10" },
                            h("span", { style: sty(`font-size:18px;`), className: "msym" },
                              "thumb_up"
                            ),
                            "Send YES"
                          ),
                          h("button", { onClick: fn($a.no), style: sty(`display:flex; align-items:center; gap:7px; background:#93000A; border:0; border-radius:999px; padding:10px 22px 10px 16px; color:#fff; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`), className: "k-h17" },
                            h("span", { style: sty(`font-size:18px;`), className: "msym" },
                              "thumb_down"
                            ),
                            "Send NO"
                          ),
                          h("button", { onClick: fn($a.ask), "aria-disabled": $a.askDisabled, title: $a.askReason, style: sty(`background:transparent; border:1px solid #414942; border-radius:999px; padding:10px 18px; color:#C4CBC2; font:inherit; font-size:13px; cursor:pointer;`), className: "k-h0" },
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
                  h("button", { onClick: fn(v.newAuthRequest), style: sty(`display:flex; align-items:center; gap:6px; background:#1B4D33; border:0; border-radius:999px; padding:9px 16px 9px 12px; color:#9FF7C4; font:inherit; font-size:12.5px; font-weight:500; cursor:pointer;`), className: "k-h8" },
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
                  h("button", { onClick: fn(v.runOneClick), style: sty(`background:#9FF7C4; border:0; border-radius:999px; padding:16px 32px 16px 26px; color:#00391F; font:inherit; font-size:15px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:9px; animation:m3Glow 2.2s ease-in-out infinite; flex:0 0 auto;`), className: "k-h18" },
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
                    ($m.off ? h("button", { onClick: fn($m.pick), style: sty(`background:rgba(0,0,0,.22); border:1px solid rgba(159,247,196,.4); border-radius:999px; padding:7px 15px; color:#9FF7C4; font:inherit; font-size:12.5px; cursor:pointer;`), className: "k-h19" },
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
                    ($t.off ? h("button", { onClick: fn($t.pick), style: sty(`display:flex; align-items:center; gap:6px; background:transparent; border:1px solid #414942; border-radius:999px; padding:8px 14px 8px 11px; color:#C4CBC2; font:inherit; font-size:12.5px; cursor:pointer;`), className: "k-h7" },
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
                    ($t.off ? h("button", { onClick: fn($t.pick), title: $t.label, style: sty(`width:32px; height:32px; border-radius:9px; background:transparent; border:1px solid #414942; color:#9AA39B; cursor:pointer;`), className: "k-h14" },
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
                    h("button", { onClick: fn(v.zoomOut), style: sty(`width:28px; height:28px; border-radius:50%; background:transparent; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h0" },
                      h("span", { style: sty(`font-size:17px;`), className: "msym" },
                        "remove"
                      )
                    ),
                    h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12px; color:#9AA39B; min-width:46px; text-align:center;`) },
                      S(v.zoomLabel)
                    ),
                    h("button", { onClick: fn(v.zoomIn), style: sty(`width:28px; height:28px; border-radius:50%; background:transparent; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h0" },
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
                        ($l.off ? h("button", { onClick: fn($l.pick), style: sty(`background:transparent; border:0; border-radius:999px; padding:5px 12px; color:#9AA39B; font:inherit; font-size:11.5px; cursor:pointer;`), className: "k-h20" },
                            S($l.label)
                          ) : null)
                      )))
                    ),
                    h("div", { style: sty(`position:absolute; right:10px; bottom:10px; z-index:3; display:flex; gap:5px; background:rgba(20,26,21,.9); border-radius:12px; padding:5px;`) },
                      A(v.canvasOps).map(($o, $o$i) => R($o$i, h("button", { onClick: fn($o.run), title: $o.label, style: sty(`width:30px; height:30px; border-radius:8px; background:transparent; border:0; color:#9AA39B; cursor:pointer;`), className: "k-h11" },
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
                          h("span", { style: sty(`flex:1; font-size:12.5px; font-weight:500; color:#DFE4DC;`) },
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
                            h("button", { onClick: fn($n.left), title: `Nudge left`, style: sty(`width:26px; height:26px; border-radius:7px; background:#262B26; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h11" },
                              h("span", { style: sty(`font-size:15px;`), className: "msym" },
                                "chevron_left"
                              )
                            ),
                            h("button", { onClick: fn($n.up), title: `Nudge up`, style: sty(`width:26px; height:26px; border-radius:7px; background:#262B26; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h11" },
                              h("span", { style: sty(`font-size:15px;`), className: "msym" },
                                "expand_less"
                              )
                            ),
                            h("button", { onClick: fn($n.down), title: `Nudge down`, style: sty(`width:26px; height:26px; border-radius:7px; background:#262B26; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h11" },
                              h("span", { style: sty(`font-size:15px;`), className: "msym" },
                                "expand_more"
                              )
                            ),
                            h("button", { onClick: fn($n.right), title: `Nudge right`, style: sty(`width:26px; height:26px; border-radius:7px; background:#262B26; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h11" },
                              h("span", { style: sty(`font-size:15px;`), className: "msym" },
                                "chevron_right"
                              )
                            ),
                            h("div", { style: sty(`flex:1;`) }),
                            h("button", { onClick: fn($n.connect), title: `Connect to…`, style: sty(`width:26px; height:26px; border-radius:7px; background:#262B26; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h11" },
                              h("span", { style: sty(`font-size:15px;`), className: "msym" },
                                "timeline"
                              )
                            ),
                            h("button", { onClick: fn($n.dup), "aria-disabled": $n.dupDisabled, title: $n.dupReason, style: sty(`width:26px; height:26px; border-radius:7px; background:#262B26; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h11" },
                              h("span", { style: sty(`font-size:15px;`), className: "msym" },
                                "content_copy"
                              )
                            ),
                            h("button", { onClick: fn($n.del), "aria-disabled": $n.delDisabled, title: $n.delReason, style: sty(`width:26px; height:26px; border-radius:7px; background:#262B26; border:0; color:#FFB4AB; cursor:pointer;`), className: "k-h12" },
                              h("span", { style: sty(`font-size:15px;`), className: "msym" },
                                "delete"
                              )
                            )
                          ) : null)
                      ))),
                    h("div", { style: sty(`position:absolute; left:16px; bottom:14px; display:flex; gap:8px;`) },
                      A(v.paletteNodes).map(($p, $p$i) => R($p$i, h("button", { onClick: fn($p.add), style: sty(`display:flex; align-items:center; gap:6px; background:#1B211C; border:1px solid #414942; border-radius:999px; padding:7px 13px 7px 10px; color:#C4CBC2; font:inherit; font-size:12px; cursor:pointer;`), className: "k-h21" },
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
                        h("button", { onClick: fn(v.addEdge), title: `Add a connection`, style: sty(`width:26px; height:26px; border-radius:50%; background:#262B26; border:0; color:#9FF7C4; cursor:pointer;`), className: "k-h9" },
                          h("span", { style: sty(`font-size:16px;`), className: "msym" },
                            "add"
                          )
                        )
                      ),
                      h("div", { style: sty(`display:flex; flex-direction:column; gap:8px;`) },
                        A(v.edgeRows).map(($e, $e$i) => R($e$i, h("div", { style: sty(`background:#141A15; border-radius:10px; padding:9px 10px;`) },
                            h("div", { style: sty(`display:flex; align-items:center; gap:6px;`) },
                              h("span", { style: sty(`flex:1; font-size:11.5px; color:#DFE4DC; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                                S($e.from)
                              ),
                              h("span", { style: sty(`font-size:15px; color:#82D9A5;`), className: "msym" },
                                "arrow_forward"
                              ),
                              h("span", { style: sty(`flex:1; font-size:11.5px; color:#DFE4DC; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                                S($e.to)
                              ),
                              h("button", { onClick: fn($e.del), title: `Remove`, style: sty(`width:22px; height:22px; border-radius:50%; background:transparent; border:0; color:#9AA39B; cursor:pointer;`), className: "k-h12" },
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
                                ($o.off ? h("button", { onClick: fn($o.pick), style: sty(`background:transparent; border:1px solid #333B34; border-radius:6px; padding:4px 9px; color:#9AA39B; font:inherit; font-size:10.5px; cursor:pointer;`), className: "k-h22" },
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
                    h("button", { onClick: fn(v.openTableRegex), title: `Regex builder`, style: sty(`width:28px; height:28px; border-radius:50%; background:#262B26; border:0; color:#82D9A5; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto;`), className: "k-h9" },
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
                      ($f.off ? h("button", { onClick: fn($f.pick), style: sty(`background:transparent; border:1px solid #414942; border-radius:8px; padding:5px 12px; color:#C4CBC2; font:inherit; font-size:12px; cursor:pointer;`), className: "k-h0" },
                          S($f.label)
                        ) : null)
                    )))
                  ),
                  h("button", { onClick: fn(v.openWizard), style: sty(`display:flex; align-items:center; gap:7px; background:#1B4D33; border:0; border-radius:999px; padding:10px 18px 10px 14px; color:#9FF7C4; font:inherit; font-size:13px; font-weight:500; cursor:pointer;`), className: "k-h8" },
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
                    A(v.bulkActions).map(($b, $b$i) => R($b$i, h("button", { onClick: fn($b.run), style: sty(`display:flex; align-items:center; gap:6px; background:rgba(0,0,0,.24); border:0; border-radius:999px; padding:7px 14px 7px 11px; color:#9FF7C4; font:inherit; font-size:12.5px; cursor:pointer;`), className: "k-h23" },
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
                  h("button", { onClick: fn(v.toggleAll), title: `Select all`, style: sty(`width:20px; height:20px; border-radius:5px; border:2px solid ${S(v.allBorder)}; background:${S(v.allBg)}; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;`) },
                    h("span", { style: sty(`font-size:15px; color:#00391F;`), className: "msym" },
                      S(v.allIcon)
                    )
                  ),
                  A(v.tableCols).map(($h, $h$i) => R($h$i, h("div", null,
                      S($h)
                    )))
                ),
                (v.tableHasState ? h("div", { role: `status`, "aria-live": `polite`, style: sty(`display:flex; align-items:flex-start; gap:10px; padding:18px 16px; border-top:1px solid #262B26; background:${S(v.tableStateBg)};`) },
                    h("span", { style: sty(`font-size:20px; color:${S(v.tableStateFg)};`), className: "msym" },
                      S(v.tableStateIcon)
                    ),
                    h("div", { style: sty(`min-width:0;`) },
                      h("div", { style: sty(`font-size:13px; font-weight:600; color:${S(v.tableStateFg)};`) },
                        S(v.tableStateTitle)
                      ),
                      h("div", { style: sty(`font-size:12px; color:#9AA39B; margin-top:4px; line-height:1.5;`) },
                        S(v.tableStateBody)
                      )
                    )
                  ) : null),
                A(v.tableRows).map(($r, $r$i) => R($r$i, h("div", { onContextMenu: fn($r.ctx), style: sty(`display:grid; grid-template-columns:44px ${S(v.tableGrid)}; gap:10px; padding:12px 16px; border-top:1px solid #262B26; cursor:pointer; align-items:center; background:${S($r.bg)}; animation:m3Slide .26s cubic-bezier(.2,0,0,1) both; ${S($r.rnd)}`), className: "k-h15" },
                    h("button", { onClick: fn($r.toggle), style: sty(`width:20px; height:20px; border-radius:5px; border:2px solid ${S($r.border)}; background:${S($r.checkBg)}; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;`) },
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
                      ($c.isMono ? h("div", { "data-read-state": $c.readState, style: sty(`font-family:'Roboto Mono',monospace; font-size:12.5px; color:#C4CBC2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                          S($c.text)
                        ) : null),
                      ($c.isText ? h("div", { "data-read-state": $c.readState, style: sty(`font-size:13px; color:#DFE4DC; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                          S($c.text)
                        ) : null)
                    )))
                  )))
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
                          h("button", { onClick: fn($s.info), style: sty(`width:20px; height:20px; border-radius:50%; background:#262B26; border:0; color:#82D9A5; cursor:pointer; display:flex; align-items:center; justify-content:center;`), className: "k-h9" },
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
                            ($o.off ? h("button", { onClick: fn($o.pick), style: sty(`background:transparent; border:1px solid #414942; border-radius:8px; padding:7px 14px; color:#C4CBC2; font-family:'Roboto Mono',monospace; font-size:12.5px; cursor:pointer;`), className: "k-h0" },
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
                    h("button", { onClick: fn(v.runCli), style: sty(`margin-top:14px; display:flex; align-items:center; gap:7px; background:#82D9A5; border:0; border-radius:999px; padding:10px 20px 10px 15px; color:#00391F; font:inherit; font-size:13px; font-weight:500; cursor:pointer;`), className: "k-h10" },
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
                      A(v.regexPalette).map(($p, $p$i) => R($p$i, h("button", { onClick: fn($p.add), style: sty(`background:transparent; border:1px dashed #414942; border-radius:8px; padding:6px 12px; color:#9AA39B; font-family:'Roboto Mono',monospace; font-size:12px; cursor:pointer;`), className: "k-h21" },
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
                    A(v.memRows).map(($m, $m$i) => R($m$i, h("div", { style: sty(`padding:12px 18px; border-top:1px solid #262B26; display:grid; grid-template-columns:150px 1fr 92px; gap:12px; align-items:center; animation:m3Slide .26s cubic-bezier(.2,0,0,1) both;`), className: "k-h15" },
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
                      h("button", { onClick: fn($p.act), style: sty(`margin-top:10px; width:100%; background:#262B26; border:0; border-radius:999px; padding:9px 0; color:#9FF7C4; font:inherit; font-size:12.5px; font-weight:500; cursor:pointer;`), className: "k-h9" },
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
                        A(v.docsRegexPalette).map(($p, $p$i) => R($p$i, h("button", { onClick: fn($p.add), style: sty(`background:transparent; border:1px dashed #414942; border-radius:8px; padding:5px 10px; color:#9AA39B; font-family:'Roboto Mono',monospace; font-size:11.5px; cursor:pointer;`), className: "k-h21" },
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
                      A(v.docsResults).map(($r, $r$i) => R($r$i, h("div", { onClick: fn($r.select), style: sty(`padding:10px 16px; border-top:1px solid #262B26; cursor:pointer; background:${S($r.bg)};`), className: "k-h15" },
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
                      A(v.docsSuggested).map(($sg, $sg$i) => R($sg$i, h("div", { onClick: fn($sg.select), style: sty(`display:flex; align-items:center; gap:8px; padding:6px 0; cursor:pointer; color:#9FF7C4; font-size:12.5px;`), className: "k-h24" },
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
                    A(v.changelogPresets).map(($pr, $pr$i) => R($pr$i, h("button", { onClick: fn($pr.apply), style: sty(`background:transparent; border:1px solid #414942; border-radius:999px; padding:6px 12px; color:#C4CBC2; font:inherit; font-size:11.5px; cursor:pointer;`), className: "k-h0" },
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
                    h("button", { onClick: fn(v.changelogCopy), style: sty(`display:flex; align-items:center; gap:6px; background:transparent; border:1px solid #414942; border-radius:999px; padding:7px 14px; color:#C4CBC2; font:inherit; font-size:12.5px; cursor:pointer;`), className: "k-h0" },
                      h("span", { style: sty(`font-size:15px; color:#82D9A5;`), className: "msym" },
                        "content_copy"
                      ),
                      "Copy"
                    ),
                    h("button", { onClick: fn(v.changelogExport), style: sty(`display:flex; align-items:center; gap:6px; background:transparent; border:1px solid #414942; border-radius:999px; padding:7px 14px; color:#C4CBC2; font:inherit; font-size:12.5px; cursor:pointer;`), className: "k-h0" },
                      h("span", { style: sty(`font-size:15px; color:#82D9A5;`), className: "msym" },
                        "download"
                      ),
                      "Export"
                    )
                  )
                ),
                (v.changelogRegexOn ? h("div", { style: sty(`display:flex; flex-wrap:wrap; gap:6px;`) },
                    A(v.changelogRegexPalette).map(($p, $p$i) => R($p$i, h("button", { onClick: fn($p.add), style: sty(`background:transparent; border:1px dashed #414942; border-radius:8px; padding:5px 10px; color:#9AA39B; font-family:'Roboto Mono',monospace; font-size:11.5px; cursor:pointer;`), className: "k-h21" },
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
                  h("button", { onClick: fn($g.wizard), style: sty(`display:flex; align-items:center; gap:6px; background:transparent; border:1px solid #414942; border-radius:999px; padding:7px 14px 7px 11px; color:#C4CBC2; font:inherit; font-size:12.5px; cursor:pointer; white-space:nowrap;`), className: "k-h0" },
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
        h("div", { role: `dialog`, "aria-modal": `false`, "aria-label": v.infoTitle, style: sty(`position:absolute; ${S(v.infoChrome)} max-height:calc(100vh - 132px); overflow-y:auto; background:#252B25; padding:18px 20px; box-shadow:0 8px 28px rgba(0,0,0,.6); z-index:61;`) },
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
              ($d.off ? h("button", { onClick: fn($d.pick), title: $d.label, style: sty(`width:24px; height:24px; border-radius:7px; background:transparent; border:0; color:#778078; cursor:pointer;`), className: "k-h25" },
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
          h("div", { style: sty(`display:flex; gap:8px; margin-top:14px;`) },
            h("button", { onClick: fn(v.closeInfo), style: sty(`flex:1; background:#82D9A5; border:0; border-radius:999px; padding:10px 0; color:#00391F; font:inherit; font-size:13px; font-weight:500; cursor:pointer;`) },
              "Got it"
            ),
            h("button", { onClick: fn(v.openWizard), style: sty(`flex:1; background:transparent; border:1px solid #414942; border-radius:999px; padding:10px 0; color:#C4CBC2; font:inherit; font-size:13px; cursor:pointer;`), className: "k-h7" },
              "Walk me through it"
            )
          )
        )
      ) : null),
      (v.wizardOpen ? h("div", { role: `dialog`, "aria-modal": `false`, "aria-label": v.wizardTitle, style: sty(`position:absolute; ${S(v.wizardChrome)} max-height:100vh; background:#141A15; box-shadow:-8px 0 32px rgba(0,0,0,.5); z-index:55; display:flex; flex-direction:column;`) },
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
                ($d.off ? h("button", { onClick: fn($d.pick), title: $d.label, style: sty(`width:26px; height:26px; border-radius:7px; background:transparent; border:0; color:#778078; cursor:pointer;`), className: "k-h26" },
                    h("span", { style: sty(`font-size:15px;`), className: "msym" },
                      S($d.icon)
                    )
                  ) : null)
              )))
            ),
            h("button", { onClick: fn(v.closeWizard), style: sty(`width:32px; height:32px; border-radius:50%; background:transparent; border:0; color:#C4CBC2; cursor:pointer; flex:0 0 auto;`), className: "k-h0" },
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
              ($w.done ? h("button", { onClick: fn($w.go), style: sty(`display:flex; align-items:center; gap:6px; background:transparent; border:0; border-radius:999px; padding:6px 12px; color:#82D9A5; font:inherit; font-size:11.5px; cursor:pointer; white-space:nowrap;`), className: "k-h7" },
                  h("span", { style: sty(`font-size:15px;`), className: "msym" },
                    "check_circle"
                  ),
                  S($w.label)
                ) : null),
              ($w.todo ? h("button", { onClick: fn($w.go), style: sty(`display:flex; align-items:center; gap:6px; background:transparent; border:0; border-radius:999px; padding:6px 12px; color:#778078; font:inherit; font-size:11.5px; cursor:pointer; white-space:nowrap;`), className: "k-h7" },
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
            h("button", { onClick: fn(v.wizardBack), style: sty(`background:transparent; border:1px solid #414942; border-radius:999px; padding:10px 20px; color:#C4CBC2; font:inherit; font-size:13px; cursor:pointer;`), className: "k-h7" },
              "Back"
            ),
            h("div", { style: sty(`flex:1;`) }),
            h("button", { onClick: fn(v.wizardNext), style: sty(`background:#82D9A5; border:0; border-radius:999px; padding:10px 24px; color:#00391F; font:inherit; font-size:13px; font-weight:500; cursor:pointer;`), className: "k-h10" },
              S(v.wizardNextLabel)
            )
          )
        ) : null),
      (v.paletteOpen ? F(
        h("div", { onClick: fn(v.togglePalette), style: sty(`position:absolute; inset:0; background:rgba(0,0,0,.5); z-index:70;`) }),
        h("div", { role: `dialog`, "aria-modal": `true`, "aria-label": `Command palette`, style: sty(`position:absolute; left:50%; top:88px; transform:translateX(-50%); width:620px; max-width:calc(100vw - 24px); background:#252B25; border-radius:20px; box-shadow:0 12px 40px rgba(0,0,0,.6); z-index:71; overflow:hidden; animation:dlgPalette .22s cubic-bezier(.2,0,0,1);`) },
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
            A(v.paletteItems).map(($p, $p$i) => R($p$i, h("button", { onClick: fn($p.go), style: sty(`width:100%; text-align:left; display:flex; align-items:center; gap:12px; background:transparent; border:0; border-radius:12px; padding:11px 14px; cursor:pointer;`), className: "k-h27" },
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
      (v.confirmationShell ? h("div", { style: sty(`position:absolute; inset:0; background:rgba(0,0,0,.66); z-index:80; display:flex; align-items:center; justify-content:center; padding:20px;`) },
          h("div", { role: `dialog`, "aria-modal": `true`, "aria-labelledby": `confirm-title`, "aria-describedby": `confirm-body`, onKeyDown: v.onConfirmationKeyDown, style: sty(`width:620px; max-width:100%; max-height:88vh; overflow-y:auto; background:#252B25; border:1px solid #414942; border-radius:28px; padding:26px 28px; box-shadow:0 16px 48px rgba(0,0,0,.7); animation:dlgCeremony .3s cubic-bezier(.2,0,0,1);`) },
            h("div", { style: sty(`display:flex; align-items:flex-start; gap:12px;`) },
              h("span", { style: sty(`font-size:26px; color:#FFB4AB;`), className: "msym" },
                "gpp_maybe"
              ),
              h("div", { style: sty(`flex:1; min-width:0;`) },
                h("div", { id: `confirm-title`, style: sty(`font-size:19px; font-weight:500;`) },
                  S(v.ceremonyTitle)
                ),
                h("div", { id: `confirm-body`, style: sty(`font-size:12.5px; color:#9AA39B; line-height:1.55; margin-top:5px;`) },
                  S(v.ceremonyBody)
                ),
                h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; color:#8FA394; margin-top:6px; word-break:break-word;`) },
                  S(v.ceremonyCmd)
                )
              ),
              h("button", { onClick: fn(v.cancelCeremony), "aria-label": `Emergency exit`, style: sty(`background:transparent; border:0; color:#C4CBC2; cursor:pointer;`) },
                h("span", { className: "msym" },
                  "close"
                )
              )
            ),
            h("div", { style: sty(`margin-top:18px; display:grid; grid-template-columns:1fr 1fr; gap:12px;`) },
              h("button", { onClick: fn(v.confirmKeyOne), "aria-pressed": v.keyOnePressed, style: sty(`border:2px solid ${S(v.keyOneBorder)}; border-radius:18px; background:#141A15; color:#DFE4DC; padding:16px; cursor:pointer; font:inherit; text-align:left;`) },
                h("strong", null,
                  "Key 1"
                ),
                h("br", null),
                h("span", { style: sty(`font-size:12px; color:#9AA39B;`) },
                  S(v.keyOneStatus)
                )
              ),
              h("button", { onClick: fn(v.confirmKeyTwo), "aria-pressed": v.keyTwoPressed, style: sty(`border:2px solid ${S(v.keyTwoBorder)}; border-radius:18px; background:#141A15; color:#DFE4DC; padding:16px; cursor:pointer; font:inherit; text-align:left;`) },
                h("strong", null,
                  "Key 2"
                ),
                h("br", null),
                h("span", { style: sty(`font-size:12px; color:#9AA39B;`) },
                  S(v.keyTwoStatus)
                )
              )
            ),
            h("div", { style: sty(`margin-top:18px;`) },
              h("label", { htmlFor: `operation-slider`, style: sty(`display:block; font-size:13px; font-weight:500;`) },
                "Full-range confirmation"
              ),
              h("div", { style: sty(`font-size:12px; color:#9AA39B; margin:4px 0 10px;`) },
                "Both independent keys must be active before the slider can authorize submission."
              ),
              h("input", { id: `operation-slider`, type: `range`, min: `0`, max: `100`, value: v.slideVal, onChange: fn(v.onSemanticSlide), onInput: fn(v.onSemanticSlide), "aria-disabled": v.sliderDisabled, "aria-valuetext": v.slideStatus, style: sty(`width:100%;`) })
            ),
            h("div", { role: `status`, "aria-live": `polite`, style: sty(`margin-top:16px; border-radius:14px; background:#141A15; padding:12px 14px;`) },
              h("div", { style: sty(`font-size:12.5px; font-weight:600; color:${S(v.receiptColour)};`) },
                S(v.receiptTitle)
              ),
              h("div", { style: sty(`font-size:11.5px; color:#9AA39B; margin-top:4px; line-height:1.5;`) },
                S(v.receiptBody)
              ),
              h("div", { style: sty(`font-family:'Roboto Mono',monospace; font-size:10.5px; color:#778078; margin-top:5px;`) },
                S(v.receiptId)
              )
            ),
            h("div", { style: sty(`display:flex; gap:10px; justify-content:flex-end; margin-top:18px;`) },
              h("button", { onClick: fn(v.cancelCeremony), style: sty(`background:transparent; border:1px solid #414942; border-radius:999px; color:#C4CBC2; padding:10px 18px; font:inherit; cursor:pointer;`) },
                "Emergency exit"
              ),
              h("button", { onClick: fn(v.submitConfirmedOperation), "aria-disabled": v.submitDisabled, style: sty(`background:#93000A; border:0; border-radius:999px; color:#fff; padding:10px 20px; font:inherit; font-weight:600; cursor:pointer;`) },
                "Submit to host"
              )
            )
          )
        ) : null),
      (v.legacyConfirmation ? h("div", { style: sty(`position:absolute; inset:0; background:rgba(0,0,0,.66); z-index:80; display:flex; align-items:center; justify-content:center;`) },
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
              h("button", { onClick: fn(v.cancelCeremony), style: sty(`width:36px; height:36px; border-radius:50%; background:transparent; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h27" },
                h("span", { style: sty(`font-size:20px;`), className: "msym" },
                  "close"
                )
              )
            ),
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
                h("button", { onClick: fn(v.turnKey), style: sty(`margin:0 auto; width:150px; height:150px; border-radius:50%; background:#1B211C; border:3px solid #414942; cursor:pointer; display:flex; align-items:center; justify-content:center; transform:rotate(${S(v.keyAngle)});`), className: "k-h16" },
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
                h("button", { onClick: fn(v.executeCeremony), style: sty(`margin-top:20px; background:#93000A; border:0; border-radius:999px; padding:13px 30px; color:#fff; font:inherit; font-size:14px; font-weight:500; cursor:pointer;`), className: "k-h17" },
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
            h("button", { onClick: fn(v.superEasy), style: sty(`display:flex; align-items:center; gap:14px; width:100%; margin-top:18px; background:#9FF7C4; border:0; border-radius:20px; padding:18px 22px; cursor:pointer; text-align:left; animation:m3Glow 2.6s ease-in-out infinite;`), className: "k-h18" },
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
            ),
            h("div", { style: sty(`display:flex; align-items:center; gap:12px; margin-top:20px;`) },
              h("button", { onClick: fn(v.skipOnboard), style: sty(`background:transparent; border:0; color:#9AA39B; font:inherit; font-size:13px; cursor:pointer; padding:12px 14px; border-radius:999px; white-space:nowrap; flex:0 0 auto;`), className: "k-h7" },
                "Skip setup"
              ),
              h("div", { style: sty(`flex:1;`) }),
              h("button", { onClick: fn(v.onboardBack), style: sty(`background:transparent; border:1px solid #414942; border-radius:999px; padding:12px 24px; color:#C4CBC2; font:inherit; font-size:14px; cursor:pointer;`), className: "k-h7" },
                "Back"
              ),
              h("button", { onClick: fn(v.onboardNext), style: sty(`background:#82D9A5; border:0; border-radius:999px; padding:12px 30px; color:#00391F; font:inherit; font-size:14px; font-weight:500; cursor:pointer;`), className: "k-h10" },
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
        h("div", { role: `dialog`, "aria-modal": `false`, "aria-label": `Regex builder`, style: sty(`position:absolute; ${S(v.regexChrome)} max-height:86vh; overflow-y:auto; background:#252B25; padding:18px 20px; box-shadow:0 10px 32px rgba(0,0,0,.6); z-index:97;`) },
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
              ($d.off ? h("button", { onClick: fn($d.pick), title: $d.label, style: sty(`width:26px; height:26px; border-radius:7px; background:transparent; border:0; color:#778078; cursor:pointer;`), className: "k-h25" },
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
            A(v.rxTools).map(($t, $t$i) => R($t$i, h("button", { onClick: fn($t.run), title: $t.title, style: sty(`display:flex; align-items:center; gap:5px; background:#1B211C; border:1px solid #414942; border-radius:8px; padding:5px 10px; color:#C4CBC2; font:inherit; font-size:11.5px; cursor:pointer;`), className: "k-h21" },
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
                A($g.items).map(($i, $i$i) => R($i$i, h("button", { onClick: fn($i.add), style: sty(`display:flex; flex-direction:column; align-items:flex-start; gap:2px; background:#1B211C; border:1px solid #414942; border-radius:10px; padding:7px 11px; cursor:pointer;`), className: "k-h16" },
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
              ($f.off ? h("button", { onClick: fn($f.toggle), style: sty(`background:transparent; border:1px solid #414942; border-radius:8px; padding:6px 12px; color:#9AA39B; font:inherit; font-size:12px; cursor:pointer;`), className: "k-h14" },
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
        h("div", { role: `menu`, "aria-label": `Actions for ${S(v.ctxTarget)}`, onKeyDown: v.onContextKeyDown, style: sty(`position:absolute; left:${S(v.ctxX)}; top:${S(v.ctxY)}; width:274px; max-height:calc(100vh - 24px); overflow:auto; background:#252B25; border:1px solid #414942; border-radius:14px; padding:6px; box-shadow:0 10px 30px rgba(0,0,0,.6); z-index:79; animation:dlgCtx .14s cubic-bezier(.2,1.3,.4,1);`) },
          h("div", { style: sty(`padding:8px 12px 6px; font-family:'Roboto Mono',monospace; font-size:10.5px; color:#8FA394; border-bottom:1px solid #333B34; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
            S(v.ctxTarget)
          ),
          h("div", { role: `search`, style: sty(`display:flex; align-items:center; gap:6px; margin:4px; padding:3px 6px; background:#141A15; border-radius:9px;`) },
            h("input", { type: `search`, value: v.contextQuery, onInput: fn(v.onContextQuery), placeholder: `Filter actions`, "aria-label": `Filter this menu`, style: sty(`flex:1; min-width:0; background:transparent; border:0; color:#DFE4DC; font:inherit; font-size:12px;`) }),
            h("button", { onClick: fn(v.openContextRegex), "aria-label": `Open regex builder for this menu`, style: sty(`background:transparent; border:0; color:#82D9A5; cursor:pointer;`) },
              h("span", { className: "msym" },
                "data_object"
              )
            )
          ),
          A(v.ctxItems).map(($i, $i$i) => R($i$i, h("button", { role: `menuitem`, "aria-disabled": $i.disabled, title: $i.reason, onClick: fn($i.act), onMouseEnter: fn($i.hover), style: sty(`width:100%; display:flex; align-items:center; gap:11px; background:${S($i.bg)}; border:0; border-radius:9px; padding:9px 12px; color:#DFE4DC; font:inherit; font-size:13px; cursor:pointer; text-align:left;`), className: "k-h27" },
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
        (v.subOpen ? h("div", { role: `menu`, "aria-label": `Nested actions`, style: sty(`position:absolute; left:${S(v.subX)}; top:${S(v.subY)}; width:230px; max-height:calc(100vh - 24px); overflow:auto; background:#252B25; border:1px solid #414942; border-radius:14px; padding:6px; box-shadow:0 10px 30px rgba(0,0,0,.6); z-index:80; animation:dlgCtx .13s cubic-bezier(.2,1.3,.4,1);`) },
            A(v.subItems).map(($i, $i$i) => R($i$i, h("button", { role: `menuitem`, "aria-disabled": $i.disabled, title: $i.reason, onClick: fn($i.run), style: sty(`width:100%; display:flex; align-items:center; gap:11px; background:transparent; border:0; border-radius:9px; padding:9px 12px; color:#DFE4DC; font:inherit; font-size:13px; cursor:pointer; text-align:left;`), className: "k-h27" },
                h("span", { style: sty(`font-size:18px; color:#82D9A5;`), className: "msym" },
                  S($i.icon)
                ),
                h("span", { style: sty(`flex:1;`) },
                  S($i.label)
                )
              )))
          ) : null)
      ) : null),
      (v.lockOpen ? h("div", { role: `dialog`, "aria-modal": `false`, "aria-label": `Lock this element`, style: sty(`position:absolute; ${S(v.lockChrome)} max-height:88vh; overflow-y:auto; background:#252B25; padding:18px 20px; box-shadow:0 10px 32px rgba(0,0,0,.6); z-index:82;`) },
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
              ($d.off ? h("button", { onClick: fn($d.pick), title: $d.label, style: sty(`width:26px; height:26px; border-radius:7px; background:transparent; border:0; color:#778078; cursor:pointer;`), className: "k-h25" },
                  h("span", { style: sty(`font-size:15px;`), className: "msym" },
                    S($d.icon)
                  )
                ) : null)
            ))),
            h("div", { style: sty(`flex:1;`) }),
            h("button", { onClick: fn(v.closeLock), style: sty(`width:30px; height:30px; border-radius:50%; background:transparent; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h27" },
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
                ($m.off ? h("button", { onClick: fn($m.pick), style: sty(`display:flex; align-items:center; gap:10px; background:transparent; border:1px solid #414942; border-radius:12px; padding:12px 14px; color:#C4CBC2; font:inherit; font-size:13px; cursor:pointer; text-align:left;`), className: "k-h7" },
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
                A(v.pinKeys).map(($k, $k$i) => R($k$i, h("button", { onClick: fn($k.press), style: sty(`height:50px; border-radius:10px; background:linear-gradient(#20281F,#171D18); border:1px solid #414942; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:19px; cursor:pointer; transition:transform .07s, background .12s; box-shadow:0 2px 0 #0C110D;`), className: "k-h28" },
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
                  h("button", { onClick: fn(v.pinReveal), style: sty(`width:28px; height:28px; border-radius:50%; background:transparent; border:0; color:#9AA39B; cursor:pointer;`), className: "k-h2" },
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
                h("button", { onClick: fn(v.pinReveal), style: sty(`width:28px; height:28px; border-radius:50%; background:transparent; border:0; color:#9AA39B; cursor:pointer;`), className: "k-h2" },
                  h("span", { style: sty(`font-size:17px;`), className: "msym" },
                    S(v.pinEyeIcon)
                  )
                )
              ),
              h("div", { style: sty(`display:flex; gap:6px; flex-wrap:wrap; margin-top:10px;`) },
                A(v.pwBuilders).map(($b, $b$i) => R($b$i, h("button", { onClick: fn($b.run), style: sty(`display:flex; align-items:center; gap:5px; background:#1B211C; border:1px solid #414942; border-radius:8px; padding:6px 11px; color:#C4CBC2; font:inherit; font-size:11.5px; cursor:pointer;`), className: "k-h21" },
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
            h("button", { onClick: fn(v.pairAuth), "aria-disabled": v.pairAuthDisabled, title: v.pairAuthReason, style: sty(`margin-top:12px; width:100%; background:#262B26; border:0; border-radius:999px; padding:10px 0; color:#9FF7C4; font:inherit; font-size:12.5px; font-weight:500; cursor:pointer;`), className: "k-h9" },
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
              A(v.unlockKeys).map(($k, $k$i) => R($k$i, h("button", { onClick: fn($k.press), style: sty(`height:50px; border-radius:14px; background:#1B211C; border:1px solid #414942; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:19px; cursor:pointer; transition:transform .08s;`), className: "k-h29" },
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
      (v.appearOpen ? h("div", { role: `dialog`, "aria-modal": `false`, "aria-label": `Edit appearance for ${S(v.appearTarget)}`, style: sty(`position:absolute; right:0; top:40px; bottom:0; width:468px; max-width:100vw; background:#141A15; box-shadow:-8px 0 32px rgba(0,0,0,.5); z-index:84; display:flex; flex-direction:column; animation:dlgAppear .28s cubic-bezier(.2,0,0,1);`) },
          h("div", { style: sty(`padding:16px 20px 10px; display:flex; align-items:flex-start; gap:12px;`) },
            h("div", { style: sty(`flex:1;`) },
              h("div", { style: sty(`font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#8FA394;`) },
                "Edit appearance"
              ),
              h("div", { style: sty(`font-size:16px; font-weight:500; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
                S(v.appearTarget)
              )
            ),
            h("button", { onClick: fn(v.closeAppear), style: sty(`width:34px; height:34px; border-radius:50%; background:transparent; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h0" },
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
              ($t.off ? h("button", { onClick: fn($t.pick), style: sty(`background:transparent; border:1px solid #414942; border-radius:999px; padding:6px 13px; color:#9AA39B; font:inherit; font-size:11.5px; cursor:pointer;`), className: "k-h14" },
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
                    A(v.colorActions).map(($a, $a$i) => R($a$i, h("button", { onClick: fn($a.run), style: sty(`display:flex; align-items:center; gap:5px; background:#1B211C; border:1px solid #414942; border-radius:8px; padding:5px 10px; color:#C4CBC2; font:inherit; font-size:11.5px; cursor:pointer;`), className: "k-h21" },
                        h("span", { style: sty(`font-size:14px;`), className: "msym" },
                          S($a.icon)
                        ),
                        S($a.label)
                      )))
                  )
                )
              ),
              h("div", { style: sty(`display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;`) },
                A(v.colorFormats).map(($f, $f$i) => R($f$i, h("button", { onClick: fn($f.copy), style: sty(`background:#141A15; border:0; border-radius:8px; padding:6px 10px; color:#9AA39B; font-family:'Roboto Mono',monospace; font-size:11px; cursor:pointer;`), className: "k-h30" },
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
            A(v.appearActions).map(($a, $a$i) => R($a$i, h("button", { onClick: fn($a.run), style: sty(`display:flex; align-items:center; gap:6px; background:#262B26; border:0; border-radius:999px; padding:9px 15px 9px 12px; color:#C4CBC2; font:inherit; font-size:12.5px; cursor:pointer;`), className: "k-h11" },
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
              h("button", { onClick: fn(v.closeSure), style: sty(`width:34px; height:34px; border-radius:50%; background:transparent; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h27" },
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
        h("div", { role: `dialog`, "aria-modal": `true`, "aria-label": v.tabFilterTitle, style: sty(`position:absolute; left:50%; top:92px; transform:translateX(-50%); width:540px; max-width:calc(100vw - 24px); max-height:calc(100vh - 116px); overflow:auto; background:#252B25; border-radius:20px; padding:20px 22px; box-shadow:0 12px 36px rgba(0,0,0,.6); z-index:81; animation:dlgFilter .24s cubic-bezier(.2,0,0,1);`) },
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
            h("button", { onClick: fn(v.closeTabFilter), style: sty(`width:32px; height:32px; border-radius:50%; background:transparent; border:0; color:#C4CBC2; cursor:pointer;`), className: "k-h27" },
              h("span", { style: sty(`font-size:18px;`), className: "msym" },
                "close"
              )
            )
          ),
          (v.tabFilterIsColour ? h("div", { style: sty(`display:flex; flex-direction:column; gap:6px; margin-top:14px;`) },
              A(v.tabFilterColours).map(($c, $c$i) => R($c$i, h("button", { onClick: fn($c.pick), style: sty(`display:flex; align-items:center; gap:11px; background:#141A15; border:2px solid ${S($c.border)}; border-radius:12px; padding:10px 13px; cursor:pointer; text-align:left;`), className: "k-h27" },
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
              h("button", { onClick: fn(v.openTabRegex), title: `Build a pattern instead`, style: sty(`display:flex; align-items:center; gap:6px; background:#262B26; border:0; border-radius:8px; padding:6px 11px; color:#9FF7C4; font:inherit; font-size:11.5px; cursor:pointer;`), className: "k-h9" },
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
            h("div", { role: `status`, "aria-live": `polite`, style: sty(`font-size:12px; color:#9AA39B; margin-bottom:8px;`) },
              S(v.tabFilterSummary)
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
            h("button", { onClick: fn(v.applyTabFilter), "aria-disabled": v.tabFilterInvalid, style: sty(`background:#93000A; border:0; border-radius:999px; padding:11px 24px; color:#fff; font:inherit; font-size:13px; font-weight:600; cursor:pointer;`) },
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
            A(v.cpickFormats).map(($f, $f$i) => R($f$i, h("button", { onClick: fn($f.copy), style: sty(`background:#141A15; border:0; border-radius:8px; padding:6px 10px; color:#9AA39B; font-family:'Roboto Mono',monospace; font-size:11px; cursor:pointer;`), className: "k-h30" },
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
                A(v.usedColours).map(($u, $u$i) => R($u$i, h("button", { onClick: fn($u.pick), style: sty(`display:flex; align-items:center; gap:10px; background:#141A15; border:0; border-radius:10px; padding:9px 12px; cursor:pointer; text-align:left;`), className: "k-h27" },
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
      (v.toastOpen ? h("div", { role: `status`, "aria-live": `polite`, "data-severity": v.toastSeverity, style: sty(`position:absolute; left:50%; bottom:24px; transform:translateX(-50%); display:flex; align-items:center; gap:16px; background:#E4E9E0; color:#1A1C19; border:2px solid ${S(v.toastBorder)}; border-radius:12px; padding:12px 16px 12px 20px; box-shadow:0 6px 20px rgba(0,0,0,.5); z-index:85; animation:m3Slide .26s cubic-bezier(.2,1.3,.4,1);`) },
          h("span", { style: sty(`font-size:13.5px;`) },
            S(v.toastText)
          ),
          h("button", { onClick: fn(v.dismissToast), "aria-label": `Dismiss notification`, style: sty(`background:transparent; border:0; color:#146B41; font:inherit; font-size:13.5px; font-weight:500; cursor:pointer; padding:4px 8px; border-radius:8px;`) },
            "Dismiss"
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
      ctl('e_callerid','Caller ID presentation','segmented','Allowed',{ options:['Allowed','Prohibited','Unavailable'] }),
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
  dash:{ rail:'pbx', icon:'space_dashboard', label:'Dashboard', badge:'', title:'Dashboard', file:'live', kind:'dashboard',
    sub:'Host-supplied readings appear with provenance and receipt state. Missing, partial, stale, and unavailable data remain visibly distinct from verified current data.', groups:[] },
  live:{ rail:'pbx', icon:'graphic_eq', label:'Live channels', badge:'', title:'Live channels', file:'core show channels', kind:'table',
    sub:'Every channel currently up. Spy, record or hang up any of them; each action runs the full four-gate confirmation.',
    table:{ add:'Originate call', grid:'1.5fr 1fr 1fr 90px 110px', cols:['Channel','Peer','Application','Duration','State'],
      rows:[] },
    groups:[{ title:'Monitor defaults', desc:'Applied to any spy or recording started from this screen.', ctls:[
      ctl('m_spy','Spy mode','segmented','Whisper',{ options:['Listen','Whisper','Barge'] }),
      ctl('m_format','Recording format','segmented','wav',{ options:['wav','gsm','g722','ogg'] }),
      ctl('m_beep','Beep on record start','switch',true),
      ctl('m_retain','Keep recordings for','slider',90,{ min:1, max:365, unit:' days' })
    ]}] },
  endpoints:{ rail:'pbx', icon:'smartphone', label:'Endpoints', badge:'', title:'PJSIP endpoints', file:'pjsip.conf', kind:'table',
    sub:'Phones, softphones and applications that register with this PBX. Selecting a row loads its full option set below — every one of them a control, never a text field.',
    table:{ add:'New endpoint', grid:'1fr 1.2fr 1fr 1fr 120px', cols:['Endpoint','Contact','Transport','Codecs','Status'],
      rows:[] },
    groups:pjsipCtls() },
  trunks:{ rail:'pbx', icon:'swap_horiz', label:'Trunks', badge:'', title:'Trunks & registrations', file:'pjsip.conf', kind:'table',
    sub:'Outbound carriers and inbound identifies. Registration state is polled live; credentials live in the secret intake, never on this screen.',
    table:{ add:'New trunk', grid:'1fr 1.4fr 1fr 1fr 120px', cols:['Trunk','Registrar','Auth','Outbound','State'],
      rows:[] },
    groups:[{ title:'Failover', desc:'What happens when the primary carrier stops answering.', ctls:[
      ctl('t_retry','Retry interval','slider',60,{ min:10, max:600, step:10, unit:'s' }),
      ctl('t_forbidden','Forbidden retry','slider',300,{ min:30, max:1800, step:30, unit:'s' }),
      ctl('t_fatal','Fatal retry attempts','stepper',5,{ min:0, max:50 }),
      ctl('t_order','Failover order','order',[],{ pool:[], info:'No trunks are listed until the host provides verified trunk identities.' })
    ]},{ title:'Outbound identity', desc:'How your calls appear to the carrier.', ctls:[
      ctl('t_from','From domain source','segmented','Trunk',{ options:['Trunk','Endpoint','Global'] }),
      ctl('t_pai','Send P-Asserted-Identity','switch',true),
      ctl('t_privacy','Privacy header','segmented','none',{ options:['none','id','header','critical'] }),
      ctl('t_100rel','100rel','segmented','yes',{ options:['no','required','yes'] })
    ]}] },
  trunkauth:{ rail:'pbx', icon:'handshake', label:'Trunk authentication', badge:'', title:'Trunk authentication', file:'pjsip.conf · partner requests', kind:'trunkauth',
    sub:'When a trunk partner asks to change something on the shared link — a new source address, a codec, a higher call cap — the request lands here and you answer yes or no. Nothing takes effect until you do.',
    groups:[{ title:'Answering policy', desc:'How requests arrive and what may be answered without you.', ctls:[
      ctl('ta_auto','Auto-approve low-risk requests','switch',false,{ info:'Low risk means a codec addition or a health-check interval. Address changes and call caps are never auto-approved.' }),
      ctl('ta_expire','Requests expire after','slider',48,{ min:1, max:168, unit:' h' }),
      ctl('ta_notify','Notify on new request','switch',true),
      ctl('ta_mutual','Require mutual confirmation','switch',true,{ info:'Both sides must answer yes. A one-sided yes stays pending, which is what stops a partner quietly widening the link.' }),
      ctl('ta_sign','Sign my answers','switch',true),
      ctl('ta_log','Keep the answer history forever','switch',true)
    ]}] },
  canvas:{ rail:'pbx', icon:'account_tree', label:'Dialplan canvas', badge:'', title:'Dialplan canvas', file:'extensions.conf', kind:'canvas',
    sub:'One infinite canvas for dialplan, IVR and queue routing. Drop a step, wire it to the next, and the console writes the priorities for you. The inspector on the right edits whichever step is selected.', groups:[] },
  ivr:{ rail:'pbx', icon:'dialpad', label:'IVR menus', badge:'', title:'IVR menus', file:'extensions.conf', kind:'table',
    sub:'Each menu is a canvas subgraph with a prompt and a key map. Editing a key here moves the matching node on the canvas.',
    table:{ add:'New menu', grid:'1fr 1.4fr 90px 110px 120px', cols:['Menu','Prompt','Keys','Timeout','Invalid'],
      rows:[] },
    groups:[{ title:'Menu behaviour', desc:'Applies to the selected menu.', ctls:[
      ctl('i_timeout','Digit timeout','slider',7,{ min:1, max:30, unit:'s' }),
      ctl('i_retries','Retries before fallback','stepper',3,{ min:1, max:9 }),
      ctl('i_invalid','On invalid entry','segmented','Repeat',{ options:['Repeat','Operator','Voicemail','Hangup'] }),
      ctl('i_direct','Allow direct extension dial','switch',true),
      ctl('i_lang','Prompt language','select','en',{ options:['en','es','fr','de','zh'] }),
      ctl('i_barge','Allow barge-in over prompt','switch',true)
    ]}] },
  queues:{ rail:'pbx', icon:'groups', label:'Queues & agents', badge:'', title:'Queues & agents', file:'queues.conf', kind:'table',
    sub:'Ring strategy, penalties and service level, all lifted from queues.conf. Agents are dragged between queues on the canvas.',
    table:{ add:'New queue', grid:'1fr 1fr 90px 90px 120px', cols:['Queue','Strategy','Members','Waiting','Service level'],
      rows:[] },
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
  voicemail:{ rail:'media', icon:'voicemail', label:'Voicemail', badge:'', title:'Voicemail boxes', file:'voicemail.conf', kind:'table',
    sub:'Mailboxes, greetings and delivery. Attachment and storage options are switches; nothing about a mailbox needs typing except the owner name.',
    table:{ add:'New mailbox', grid:'90px 1fr 1fr 90px 110px', cols:['Box','Owner','Email','New','Storage'],
      rows:[] },
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
  confbridge:{ rail:'media', icon:'groups_3', label:'Conferences', badge:'', title:'ConfBridge rooms', file:'confbridge.conf', kind:'table',
    sub:'Bridge profiles, user profiles and menus. Every mixing option is a control; the DTMF menu is edited on the canvas.',
    table:{ add:'New room', grid:'1fr 1fr 90px 100px 110px', cols:['Room','Bridge profile','Users','Recording','State'],
      rows:[] },
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
      ctl('c_announce','Announce join and leave','segmented','name',{ options:['off','tone','name','count'] }),
      ctl('c_music','Music while alone','switch',true),
      ctl('c_dtmf','DTMF menu','select','default_menu',{ options:['default_menu','admin_menu','listen_only'] })
    ]}] },
  moh:{ rail:'media', icon:'library_music', label:'Music on hold', badge:'', title:'Music on hold', file:'musiconhold.conf', kind:'table',
    sub:'Hold classes and their sources. Files are chosen from a picker; the playlist is reordered by dragging.',
    table:{ add:'New class', grid:'1fr 1fr 1.2fr 100px', cols:['Class','Mode','Source','Tracks'],
      rows:[] },
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
      ctl('h_sort','Playback order','segmented','random',{ options:['alpha','random','randstart'], showWhen:{ control:'h_mode', is:'files' } }),
      ctl('h_announce','Announcement every','slider',30,{ min:0, max:300, step:15, unit:'s' }),
      ctl('h_volume','Volume trim','slider',0,{ min:-20, max:10, unit:' dB' })
    ]}] },
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
      ctl('ht_sesskeep','session_keep_alive','slider',15000,{ min:1000, max:120000, step:1000, unit:' ms' })
    ]}]
  },
  iaxpeers:{ rail:'pbx', icon:'swap_horiz', label:'IAX peers', badge:'', title:'IAX peers', file:'iax.conf', kind:'generic',
    sub:'IAX2 peers, users and friends. The secret is write-only: this screen can set one and can never show you the one already there, which is why there is no field displaying it.',
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
    ]}]
  },
  fcodes:{ rail:'pbx', icon:'dialpad', label:'Feature codes', badge:'', title:'Feature codes', file:'features.conf', kind:'generic',
    sub:'The digits a caller presses mid-call, and the transfer behaviour around them. These write features.conf directly. Every sequence here is free text because Asterisk accepts any digit string including * and #, and a picker cannot know what a site has standardised on -- but a control left untouched writes nothing at all.',
    groups:[{ title:'In-call feature map', desc:'The [featuremap] section. A caller presses these during a call.', ctls:[
      ctl('fc_blindxfer','blindxfer','text','',{ placeholder:'#', info:'Blind transfer: hand the call over without speaking to the destination first.' }),
      ctl('fc_atxfer','atxfer','text','',{ placeholder:'*2', info:'Attended transfer: speak to the destination first, then complete or abort with the codes below.' }),
      ctl('fc_disconnect','disconnect','text','',{ placeholder:'*0', info:'Hang the call up from either end.' }),
      ctl('fc_automixmon','automixmon','text','',{ placeholder:'*3', info:'One-touch record. This Asterisk ships automixmon; the older automon is not in its features.conf sample, so this writes automixmon rather than a key the build would ignore.' }),
      ctl('fc_parkcall','parkcall','text','',{ placeholder:'#72', info:'One-step park.' })
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
    ]}]
  },
  codecs:{ rail:'media', icon:'graphic_eq', label:'Codecs & RTP', badge:'', title:'Codecs & RTP', file:'codecs.conf · rtp.conf', kind:'generic',
    sub:'Transcoding, packetisation and the media port range. Drag the codec list to change preference order globally.',
    groups:[{ title:'Codec preference', desc:'The order Asterisk offers codecs in an SDP. Drag to reorder — there is no list to type.', ctls:[
      ctl('k_order','Global order','order',['opus','g722','ulaw','alaw','g729'],{ pool:['gsm','speex','ilbc','g726'] }),
      ctl('k_transcode','Allow transcoding','switch',true),
      ctl('k_opusbr','Opus bitrate','slider',24,{ min:6, max:64, unit:' kbps' }),
      ctl('k_ptime','Preferred ptime','segmented','20',{ options:['10','20','30','40','60'] })
    ]},{ title:'RTP', desc:'Where media lands and how it survives a bad network.', ctls:[
      ctl('r_start','RTP port range start','slider',10000,{ min:1024, max:60000, step:1000 }),
      ctl('r_end','RTP port range end','slider',20000,{ min:2048, max:65000, step:1000 }),
      ctl('r_dtmf','RFC2833 payload','stepper',101,{ min:96, max:127 }),
      ctl('r_strict','strictrtp','switch',true),
      ctl('r_ice','ICE support','switch',false),
      ctl('r_dtls','DTLS for WebRTC','switch',true)
    ]}] },
  cdr:{ rail:'data', icon:'receipt_long', label:'CDR & CEL', badge:'', title:'Call records', file:'cdr.conf · cel.conf', kind:'generic',
    sub:'Which backend stores records, what counts as an answered call, and which events are logged. Backends are picked, connection secrets come from secret intake.',
    groups:[{ title:'CDR', desc:'One row per call.', ctls:[
      ctl('d_enable','CDR enabled','switch',true),
      ctl('d_backend','Backend','select','odbc',{ options:['csv','custom','odbc','pgsql','sqlite3','mysql','manager','radius'] }),
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
  ami:{ rail:'data', icon:'api', label:'AMI & ARI', badge:'', title:'Manager & REST interfaces', file:'manager.conf · ari.conf · http.conf', kind:'table',
    sub:'Machine access to the PBX. Permissions are checkbox matrices, never a comma string you have to remember.',
    table:{ add:'New API user', grid:'1fr 1fr 1.6fr 110px', cols:['User','Interface','Permissions','State'],
      rows:[] },
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
  modules:{ rail:'sys', icon:'extension', label:'Modules', badge:'', title:'Modules', file:'modules.conf', kind:'table',
    sub:'Every loadable module with its live state. Loading and unloading are real actions and run the full confirmation ceremony.',
    table:{ add:'Load module', grid:'1.3fr 1fr 1fr 120px', cols:['Module','Type','Use count','State'],
      rows:[] },
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
      ctl('g_verbose','Verbosity','slider',3,{ min:0, max:10 }),
      ctl('g_colour','Colourise output','switch',true)
    ]},{ title:'Files & rotation', desc:'Disk logging.', ctls:[
      ctl('g_file','File levels','chips',['notice','warning','error','verbose'],{ options:['debug','trace','notice','warning','error','verbose','dtmf','fax','security'] }),
      ctl('g_rotate','Rotation strategy','segmented','rotate',{ options:['sequential','rotate','timestamp','none'] }),
      ctl('g_count','Keep files','stepper',10,{ min:1, max:100 }),
      ctl('g_size','Rotate at','slider',50,{ min:1, max:500, unit:' MB' }),
      ctl('g_queue','Queue log','switch',true)
    ]}] },
  security:{ rail:'sys', icon:'shield', label:'Security', badge:'', title:'Security', file:'acl.conf · stir_shaken.conf', kind:'generic',
    sub:'Access control, transport certificates and caller-ID attestation. Certificates are chosen from the machine store — no path is ever typed.',
    groups:[{ title:'Access control', desc:'Named ACLs applied to transports and endpoints.', ctls:[
      ctl('s_acl','Active ACL','select','trusted-nets',{ options:['trusted-nets','branch-offices','carrier-only','deny-all'] }),
      ctl('s_permit','Permitted networks','chips',[],{ options:[], info:'The host supplies verified network ranges. The design does not preload operational addresses.' }),
      ctl('s_failban','Auto-ban after failures','stepper',5,{ min:0, max:100 }),
      ctl('s_bantime','Ban duration','slider',600,{ min:60, max:86400, step:60, unit:'s' }),
      ctl('s_guest','Allow guest calls','switch',false,{ info:'Off. Always off, unless you run a public conference bridge and know exactly why you turned it on.' })
    ]},{ title:'TLS', desc:'Certificates come from the system store.', ctls:[
      ctl('s_cert','Server certificate','select','pbx.example.com',{ options:['pbx.example.com','wildcard.example.com','internal-ca-issued'] }),
      ctl('s_method','TLS method','segmented','tlsv1_3',{ options:['tlsv1_2','tlsv1_3'] }),
      ctl('s_verify','Verify client certificates','switch',false),
      ctl('s_ciphers','Cipher policy','segmented','Modern',{ options:['Modern','Intermediate','Legacy'] })
    ]},{ title:'STIR/SHAKEN', desc:'Signed caller identity for outbound calls.', ctls:[
      ctl('s_stir','Attestation enabled','switch',true),
      ctl('s_level','Attestation level','segmented','A',{ options:['A','B','C'], info:'A means you know the caller and their right to that number. C means the call just passed through you.' }),
      ctl('s_verifyin','Verify inbound identity','switch',true),
      ctl('s_failaction','On verification failure','segmented','Continue',{ options:['Continue','Tag','Reject'] })
    ]}] },
  cli:{ rail:'sys', icon:'terminal', label:'CLI builder', badge:'', title:'CLI builder', file:'asterisk -rx', kind:'cli',
    sub:'Build a real Asterisk CLI command by choosing its parts. The raw console beside it is read-only output, shown only in expert mode.', groups:[] },
  memory:{ rail:'agent', icon:'database', label:'Memory console', badge:'', title:'Memory console', file:'agent global memory', kind:'memory',
    sub:'Search the memory corpus with a visual regex builder, and watch the sync, attestation and emission guard state alongside it.', groups:[] },
  sync:{ rail:'agent', icon:'sync', label:'Sync & attestation', badge:'', title:'Sync & attestation', file:'agent-memory-sync', kind:'table',
    sub:'Every sync run, its attestation and its backup. A failed attestation blocks the next write until it is acknowledged here.',
    table:{ add:'Run sync now', grid:'1fr 1fr 1fr 1fr 120px', cols:['Run','Started','Records','Backup','Attestation'],
      rows:[] },
    groups:[{ title:'Schedule', desc:'When the console pushes memory upstream.', ctls:[
      ctl('y_auto','Automatic sync','switch',true),
      ctl('y_every','Interval','slider',60,{ min:5, max:1440, step:5, unit:' min' }),
      ctl('y_backup','Backup before write','switch',true),
      ctl('y_attest','Require attestation','switch',true),
      ctl('y_retain','Keep backups','stepper',30,{ min:1, max:365 })
    ]}] },
  skills:{ rail:'agent', icon:'auto_awesome', label:'Skills registry', badge:'', title:'Skills registry', file:'skills/', kind:'table',
    sub:'Installed agent skills with their trigger scope. Enabling a skill is a switch; nothing about a skill is typed here.',
    table:{ add:'Install skill', grid:'1.2fr 1.6fr 100px 110px', cols:['Skill','Description','Scope','State'],
      rows:[] },
    groups:[{ title:'Orchestration', desc:'Multi-agent lane defaults.', ctls:[
      ctl('u_lanes','Maximum parallel lanes','stepper',4,{ min:1, max:12 }),
      ctl('u_isolate','Isolated worktree per lane','switch',true),
      ctl('u_model','Lane model override','select','gpt-5.6-luna',{ options:['gpt-5.6-luna','inherit'] }),
      ctl('u_verify','Verification panel for high-risk lanes','switch',true),
      ctl('u_destruct','Keep destructive actions with orchestrator','switch',true)
    ]}] },
  hub:{ rail:'agent', icon:'hub', label:'Status hub', badge:'', title:'Status hub sessions', file:'status-hub', kind:'table',
    sub:'Open sessions, their questions and reply state. The ingest token lives in the trusted process and is never shown in this window.',
    table:{ add:'Open session', grid:'1fr 1.4fr 90px 110px', cols:['Session','Subject','❓s','State'],
      rows:[] },
    groups:[{ title:'Session policy', desc:'How the console behaves as a hub client.', ctls:[
      ctl('b_poll','Reply poll interval','slider',15,{ min:5, max:300, unit:'s' }),
      ctl('b_notify','Desktop notification on reply','switch',true),
      ctl('b_close','Auto-close idle sessions','switch',false),
      ctl('b_report','Report worktree state each run','switch',true)
    ]}] },
  vocab:{ rail:'agent', icon:'policy', label:'Vocabulary & guard', badge:'', title:'Vocabulary & emission guard', file:'vocabulary-dictionary.json', kind:'table',
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
  ops:{ rail:'agent', icon:'rocket_launch', label:'Operations', badge:'', title:'Operations & releases', file:'release', kind:'table',
    sub:'Release history and the update feed. Packages are unsigned by policy; the console says so plainly rather than implying verification.',
    table:{ add:'Cut release', grid:'1fr 1fr 1fr 1fr 110px', cols:['Version','Published','Artifacts','Duration','State'],
      rows:[] },
    groups:[{ title:'Updates', desc:'Unsigned artifacts. The operating system may warn about an unknown publisher — that is expected.', ctls:[
      ctl('o_check','Check for updates','segmented','On start + hourly',{ options:['On start','On start + hourly','Manual'] }),
      ctl('o_stage','Stage in background','switch',true),
      ctl('o_restart','Install on next restart','switch',true),
      ctl('o_channel','Channel','segmented','Stable',{ options:['Stable','Beta'] }),
      ctl('o_hash','Verify package hashes','switch',true)
    ]}] },
  secrets:{ rail:'agent', icon:'key', label:'Secret intake', badge:'', title:'Secret intake', file:'templates/secret-intake', kind:'table',
    sub:'Credentials are captured once through the intake flow and referenced by name everywhere else. No secret value is ever rendered.',
    table:{ add:'Intake a secret', grid:'1fr 1fr 1fr 110px', cols:['Name','Used by','Rotated','State'],
      rows:[] },
    groups:[{ title:'Handling', desc:'Storage and rotation rules for everything in the intake.', ctls:[
      ctl('x_store','Storage','segmented','OS keychain',{ options:['OS keychain','Encrypted file'] }),
      ctl('x_rotate','Rotation reminder','slider',90,{ min:7, max:365, unit:' days' }),
      ctl('x_mask','Mask in all surfaces','switch',true),
      ctl('x_export','Allow export','switch',false)
    ]}] },
  servers:{ rail:'app', icon:'dns', label:'Deploy & servers', badge:'', title:'Deploy a server', file:'provisioning', kind:'servers',
    sub:'This is the main road: press the big button and a working PBX exists in about seven seconds. Connecting to a PBX somebody else built is underneath, and it is the side road.',
    table:{ add:'New connection', grid:'1fr 1fr 1.2fr 1fr 120px', cols:['Profile','Route','Target','Interface','State'],
      rows:[] },
    groups:[{ title:'Route', desc:'How this console reaches Asterisk. Everything below reshapes itself around this answer.', ctls:[
      ctl('sv_kind','Connection type','segmented','Local',{ options:['Local','Local Docker','SSH','SSH Docker'], info:'Local is the same machine. Local Docker is a container here. SSH is another machine. SSH Docker is a container on another machine, reached over SSH and then into the container.' }),
      ctl('sv_host','Host','select','',{ options:[], info:'No target identities are invented. The host must provide the reachable target list.' }),
      ctl('sv_container','Container','select','',{ options:[], info:'The host supplies running container identities.' }),
      ctl('sv_user','SSH user','select','',{ options:[], info:'The host supplies permitted connection identities.' }),
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
  notifications:{ rail:'app', icon:'notifications', label:'Notifications', badge:'', title:'Notification centre', file:'console', kind:'table',
    sub:'Every non-blocking notification the console has raised, reviewable after the fact so nothing important disappears with a toast.',
    table:{ add:'Mark all read', grid:'1fr 2fr 1fr 110px', cols:['Source','Message','When','State'],
      rows:[] },
    groups:[{ title:'Delivery', desc:'What interrupts you and what merely gets recorded.', ctls:[
      ctl('nt_toast','Show toasts','switch',true),
      ctl('nt_sound','Play a sound','switch',false),
      ctl('nt_levels','Notify on','chips',['Errors','Warnings'],{ options:['Errors','Warnings','Info','Every change'] }),
      ctl('nt_quiet','Quiet hours','switch',false),
      ctl('nt_keep','Keep history for','slider',30,{ min:1, max:365, unit:' days' })
    ]}] },
  history:{ rail:'app', icon:'history', label:'History & git', badge:'', title:'History', file:'/etc/asterisk/.git', kind:'history',
    sub:'Only host-supplied history receipts appear here. Commit, diff, branch, restore, and export actions remain unavailable until their handlers are registered.',
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
  customise:{ rail:'app', icon:'auto_awesome', label:'Customise everything', badge:'', title:'Customise everything', file:'console profile', kind:'generic',
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
    { title:'Attention', desc:'Five accommodations, each independent and each off until you switch it on. They change how the interface behaves, nothing else, and none of them says anything about you.', ctls:[
      ctl('att_focus','Focus','switch',false,{ info:'Dims everything except what you are working on. Nothing is hidden; the rest is still one click away.' }),
      ctl('att_low','Low stimulation','switch',false,{ info:'Fewer moving things, quieter colour, and only the notifications that genuinely need a person. If your system already asks for reduced motion, that is honoured whether or not this is on.' }),
      ctl('att_time','Time awareness','switch',false,{ info:'Shows how long this session has been open and how long since anything changed, where the work is.' }),
      ctl('att_one','One thing at a time','switch',false,{ info:'Keeps one next action visible, chosen by you. It survives a context switch.' }),
      ctl('att_next','Current next action','text','',{ placeholder:'What are you doing right now?', info:'The text is your chosen next action. It is stored with the mode and remains visible wherever work is shown.' }),
      ctl('att_momentum','Momentum','switch',false,{ info:'A dismissible prompt when something has been untouched for a while. Saying not now is respected for half an hour, not for thirty seconds.' })
    ]},
    { title:'Dialogs', desc:'Decoration in dialogs and message boxes.', ctls:[
      ctl('dlg_emoji','Show emojis in dialogs and message boxes','switch',false,{ info:'Adds one relevant emoji to a dialog’s heading and body. Never to a button, an action label or an accessible name: a screen reader announces an emoji by its Unicode description, so a decorated button would be heard on every focus. The wording is identical either way.' })
    ]},
    { title:'Language', desc:'Which language the console speaks. Bilingual keeps English primary and adds the Cantonese beside it. Technical identifiers -- codecs, config keys, section names, SIP URIs -- stay literal in every mode, because they have to survive being read back and typed.', ctls:[
      ctl('lang_mode','Language','segmented','English',{ options:['English','廣東話','English + 廣東話'], info:'A string with no translation yet renders as English rather than as a placeholder, so an incomplete catalog looks unfinished instead of broken.' }),
    ]},{ title:'Fun', desc:'How playful the console is allowed to be. This is a real setting, not a joke — it scales celebrations, copy and randomness together.', ctls:[
      ctl('fun_level','Fun level','slider',2,{ min:0, max:4, info:'0 is a bank. 1 is polite. 2 is the default — celebrations on meaningful wins. 3 adds jokes and bolder motion. 4 is confetti for changing a slider, rainbow fills and an app that will not stop congratulating you.' }),
      ctl('fun_copy','Copy tone','segmented','Warm',{ options:['Terse','Neutral','Warm','Comedian'] }),
      ctl('fun_celebrate','Celebrate on','chips',['Big wins','Security improvements'],{ options:['Every change','Big wins','Security improvements','Nothing'] }),
      ctl('fun_confetti','Confetti density','slider',90,{ min:0, max:300, unit:' pieces' }),
      ctl('fun_sound','Sound effects','switch',false),
      ctl('fun_mascot','Show the mascot','switch',false),
      ctl('fun_easter','Allow hidden surprises','switch',true),
      ctl('fun_random','Random appearance for every element','switch',false,{ info:'On, every rendered element is given its OWN randomly generated appearance — its own colour, radius, weight, shadow and entrance. Nothing shares a look. Turn it off and everything snaps back to the design system; your manual per-element overrides survive either way.' }),
      ctl('fun_random_seed','Randomness seed','stepper',1,{ min:1, max:999 }),
      ctl('fun_random_scope','Randomise','chips',['Colour','Radius','Shadow'],{ options:['Colour','Radius','Shadow','Type weight','Size','Rotation','Entrance animation'] }),
      ctl('fun_random_strength','How wild','slider',40,{ min:5, max:100, unit:'%' }),
      ctl('fun_random_reroll','Reroll on every screen change','switch',false)
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
      ctl('bh_confirm','Confirmation','segmented','Four gates',{ options:['Four gates','Single confirm'] }),
      ctl('bh_commit','Commit every change to git','switch',true),
      ctl('bh_lockdefault','Default lock method','select','PIN',{ options:['PIN','Password','Password + PIN','Password + PIN + TOTP'] }),
      ctl('bh_wizard','Offer the wizard first on every screen','switch',false),
      ctl('bh_explain','Show explain buttons','switch',true),
      ctl('bh_tour','Offer the tour on launch','switch',false)
    ]},{ title:'Profiles', desc:'Save the entire look and behaviour, then move it between machines.', ctls:[
      ctl('pr_active','Active profile','select','',{ options:[], info:'The host supplies verified saved profiles. No sample profile is inserted.' }),
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
  fun_level:{ what:'How playful the console is allowed to be, from 0 to 4.', why:'One dial that scales celebrations, copy tone, motion and randomness together.', values:'0 Bank, 1 Polite, 2 Balanced, 3 Playful, 4 Unhinged.', gotcha:'Level 4 celebrates trivial changes. It is delightful for a week and then you will want level 2.' }
};

const ADVANCED = ['e_symmetric','e_forcerport','e_ice','e_trust','r_dtmf','r_strict','r_ice','r_start','r_end','k_ptime','k_opusbr','a_deny','a_timeout','mo_preload','mo_noload','mo_require','g_queue','s_ciphers','s_verify','t_100rel','t_privacy','t_from','c_mixing','c_rate','l_date','d_batch','d_size','y_retain','hi_gc','hi_sign','hi_push','sv_forward','sv_sshport','cp_ease','cp_dir','fun_random_seed','fun_random_scope','fun_random_strength','fun_random_reroll','mo_curve','mo_dialog','ly_radius','ly_gap','ly_sidebar','th_tint','pr_perscreen','pr_export'];

const ORDER = ['servers','dash','live','endpoints','trunks','trunkauth','fcodes','iaxpeers','canvas','ivr','queues','voicemail','confbridge','moh','codecs','cdr','ami','modules','logger','httpd','security','cli','memory','sync','skills','hub','vocab','ops','secrets','arcade','notifications','history','customise','appearance','about','docs','changelog'];

const AUTH_REQS = [];

const REGEX_GROUPS = [
  { title:'Anchors', items:[['^','starts with'],['$','ends with'],['\\b','word edge']] },
  { title:'Characters', items:[['\\d','any digit'],['\\w','letter or digit'],['\\s','a space'],['.','any character'],['[a-z]','a letter'],['[0-9]','a number']] },
  { title:'Repeats', items:[['+','one or more'],['*','none or more'],['?','optional'],['{2,4}','between 2 and 4']] },
  { title:'Groups', items:[['(…)','capture'],['(a|b)','either'],['(?:…)','group only'],['(?!…)','not followed by']] },
  { title:'Telephony', items:[['^PJSIP/','PJSIP channels'],['^1\\d{3}$','4-digit extension'],['\\.conf$','a config file'],['(?i)fail','failure, any case']] }
];

const APPEAR_STATES = ['Default','Hover','Active','Focus','Disabled'];

const APPEAR_GROUPS = [
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

const NODES = [
  { id:'unavailable', x:24, y:28, icon:'cloud_off', title:'No verified dialplan data', detail:'Host read unavailable' }
];

const EDGES = [];
const NW = 196, NH = 68;

const NODE_CTLS = {
  unavailable:[]
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
       [ctl('w_name','Name','text',''),
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
       ctl('w_secret','Credential','select','',{ options:[], info:'Credential choices remain empty until the host supplies vault-backed references.' }),
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
       [ctl('wq_members','Members','order',[],{ pool:[], info:'The host supplies verified endpoint identities. No sample members are inserted.' }),
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
       ctl('sv_profile','Save as','select','New profile',{ options:['New profile'] })]),
    step('Target','Where exactly?','Hosts, containers and sockets are discovered and offered as a list — nothing here is typed.',
      'The console enumerates running containers and your SSH config, so a typo in a hostname is not a failure mode that exists.',
      [ctl('sv_host','Host','select','',{ options:[], info:'The host supplies verified destinations. No sample identity is used.' }),
       ctl('sv_container','Container','select','',{ options:[], info:'The host supplies verified running container identities.' }),
       ctl('sv_sshport','SSH port','stepper',22,{ min:1, max:65535 }),
       ctl('sv_user','SSH user','select','',{ options:[], info:'The host supplies permitted connection identities.' })]),
    step('Credentials','How do we authenticate?','Keys come from the agent, the machine keychain or the secret intake. No private key is ever displayed.',
      'Host key checking is on by default. If the host key changes, the console refuses to connect rather than asking you to accept it — that prompt is how people get compromised.',
      [ctl('sv_auth','SSH authentication','segmented','Agent key',{ options:['Agent key','Keychain key','Secret intake'] }),
       ctl('sv_key','Key','select','',{ options:[], info:'The host supplies credential-vault references without exposing secret material.' }),
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
       ctl('wv_box','Number','select','',{ options:[], info:'The host supplies verified mailbox identities. No sample mailbox is inserted.' }),
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
       ctl('ws_nets','Permit','chips',[],{ options:[], info:'The host supplies verified network ranges.' }),
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
       ctl('wc_confirm','Confirmation','segmented','Full ceremony',{ options:['Full ceremony','None'] }),
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
    ctl('ob_host','Host','select','',{ options:[], info:'No target is selected until the host provides a verified destination.' }),
    ctl('ob_tls','Encrypt everything','switch',true)] },
  { icon:'shield_lock', t:'Change control', b:'Destructive host actions require two independent keys, a full-range slider, and a verified operation receipt. Local intent never reports completion.', ctls:[
    ctl('ob_gates','Confirmation','segmented','All four gates',{ options:['All four gates','Key and switch only'] }),
    ctl('ob_log','Attest every change to memory','switch',true)] },
  { icon:'bolt', t:'Ready to review', b:'The host must provide an exact deployment plan, target, prerequisites, and rollback route before submission becomes available.', ctls:[
    ctl('ob_tour','Take the tour afterwards','switch',true)] }
];

const TOUR = [
  { t:'The rail', b:'Six areas. Telephony, media, records, system, the agent memory layer, and this app.', x:'110px', y:'120px' },
  { t:'Section list', b:'Each area holds its screens. The badge shows how many objects live there right now.', x:'380px', y:'160px' },
  { t:'Controls expose their capability', b:'Each interactive control names its source and stays disabled with a reason until a real handler is available.', x:'620px', y:'320px' },
  { t:'Explain button', b:'Every screen and every setting has one. It explains the idea as if you learned what a telephone was yesterday.', x:'720px', y:'90px' },
  { t:'Guided wizard', b:'Opens beside the live configuration so you can watch it change as you answer.', x:'880px', y:'90px' }
];

const CLI_STEPS = [
  { id:'verb', label:'Action', options:['core','pjsip','dialplan','queue','module','database'] },
  { id:'obj', label:'Object', options:['show','reload','set','restart'] },
  { id:'target', label:'Target', options:['endpoints','channels','contacts','registrations'] }
];

const HOST_CONTRACT = Object.freeze({
  states:['loading','verified','empty','unavailable','partial','stale'],
  cell:{ value:'host value or null', state:'verified or unread' },
  capability:{ enabled:false, reason:'required when disabled', destructive:false },
  receipt:{ ok:true, id:'required stable receipt identifier', summary:'host-confirmed result', completedAt:'ISO-8601 timestamp' },
  callbacks:'hostCallbacks[actionId](payload) returns a receipt or a promise for one'
});

class ConsoleShell extends DCLogic {
  state = {
    railId:'pbx', screen:'dash', mode:'Beginner', values:{},
    infoOpen:false, infoTitle:'', infoBody:'', infoPlain:'', infoX:'50%', infoY:'160px', infoDoc:null, infoKey:'',
    wizardOpen:false, wizardStep:0, wizardCtl:null, paletteOpen:false,
    ceremonyOpen:false, ceremonyTitle:'', ceremonyBody:'', ceremonyCmd:'', operationPayload:{}, cStep:0, keyTurned:false, holdMs:0, slideVal:0, moleHits:0, moleTime:15, moleIdx:-1,
    onboardOpen:false, onboardStep:0, tourOpen:false, tourStep:0,
    toastOpen:false, toastText:'', nodeId:'n1', zoom:100, tableFilter:'All',
    cli:{ verb:'pjsip', obj:'show', target:'endpoints' },
    regex:['^memory/', 'projects', '\\.md$'],
    patterns:{ nav:[], table:[], memory:['^memory/', 'projects'] },
    regexOpen:false, regexTarget:'nav', regexX:'300px', regexY:'120px', regexFlags:['i'],
    ctxOpen:false, ctxX:'0px', ctxY:'0px', ctxTarget:'', ctxKind:'screen',
    locks:{}, lockOpen:false, lockTarget:'', lockKey:'', lockStep:0, lockMethod:'PIN', pin:'', password:'', pinReveal:false, lockX:'40%', lockY:'22%',
    selected:[], authAnswers:{},
    sureOpen:false, sureTitle:'', sureBody:'', sureHits:0, sureNeed:3, sureCell:-1, sureAction:null,
    tabs:['dash', 'endpoints', 'canvas'], pinned:['dash'], dock:'left',
    nodePos:{}, edgeList:EDGES.map(e => e.slice()), nodeDrag:null, fullscreen:false,
    canvasTool:'select', grid:true, snap:true, guides:true, minimap:true, layer:'Dialplan',
    tabNames:{}, tabColours:{}, ctxTabKey:'', renameOpen:false, renameKey:'', renameValue:'', tabColourOpen:false,
    tabFilterOpen:false, tabFilterMode:'has', tabFilterText:'', ctxSub:'',
    rxText:'', rxManual:false, tabFilterColour:'', rndNonce:1,
    tabDrag:-1, tabOver:-1, groups:[], ctxGroupId:'', groupRenameOpen:false,
    branch:'', commits:[], histSel:'', histFilter:'All', histCompare:[],
    drag:null, dlgPos:{}, dlgDock:{ appear:'right', wizard:'right' }, dlgSize:{}, resize:null,
    unlockOpen:false, unlockKey:'', unlockPin:'', unlockPw:'',
    appearOpen:false, appearTarget:'', appearState:'Default',
    oneClickMode:'Funny', oneClickRunning:false, oneClickStep:0,
    celebrate:false, celebrateTitle:'', celebrateSub:'',
    toastSeverity:'info', notificationEvents:[], contextQuery:'',
    tabSearchQueries:{ strip:'', group:'', groups:'', master:'' },
    confirmKeyOne:false, confirmKeyTwo:false,
    operationState:'idle', operationAction:'', operationReceipt:null
  };

  fire = (title, sub, receipt) => {
    if (!receipt || receipt.ok !== true || !receipt.id) {
      this.notify('info', 'Awaiting host receipt', title + ' was not announced as complete because the host has not returned a verified operation receipt.');
      return;
    }
    this.setState({ celebrate:true, celebrateTitle:title, celebrateSub:sub });
    clearTimeout(this._cf);
    this._cf = setTimeout(() => this.setState({ celebrate:false }), 2600);
  };

  USER_MUTATION_ACTIONS = [
    { action:'set', key:'canvasTool', state:'canvasTool' }, { action:'set', key:'grid', state:'grid' },
    { action:'set', key:'snap', state:'snap' }, { action:'set', key:'guides', state:'guides' },
    { action:'set', key:'minimap', state:'minimap' }, { action:'set', key:'layer', state:'layer' },
    { action:'set', key:'zoom', state:'zoom' }, { action:'set', key:'pinned', state:'pinned' },
    { action:'set', key:'dock', state:'dock' }, { action:'set', key:'fullscreen', state:'fullscreen' },
    { action:'set', key:'branch', state:'branch' }, { action:'set', key:'sortList', state:'sortList' }
  ];
  attentionTabsNewHereMarker = () => this.onUserMutation('tabs:new-here');
  set = (k, v) => { this.setState(() => ({ [k]:v })); this.onUserMutation('set:' + k); };
  val = (c) => (this.state.values[c.id] !== undefined ? this.state.values[c.id] : c.value);
  hostSnapshot = () => ((this.props && this.props.hostState) || { status:'unavailable', capabilities:{}, screens:{}, connection:null });
  capability = (id) => {
    const host = this.hostSnapshot();
    const raw = (host.capabilities && host.capabilities[id]) || {};
    return { id, enabled:raw.enabled === true, reason:raw.reason || 'The host has not registered a handler for this action.', destructive:raw.destructive === true };
  };
  notify = (severity, title, body, receipt) => {
    const allowed = ['info','success','warning','error','progress'];
    const level = allowed.indexOf(severity) >= 0 ? severity : 'info';
    const event = { severity:level, title:title || '', body:body || '', receipt:receipt || null, at:new Date().toISOString() };
    this.setState(st => ({ toastOpen:true, toastSeverity:level, toastText:(title ? title + ': ' : '') + (body || ''), notificationEvents:[event].concat(st.notificationEvents || []).slice(0, 200) }));
    clearTimeout(this._tt);
    if (level !== 'warning' && level !== 'error' && level !== 'progress') this._tt = setTimeout(() => this.setState({ toastOpen:false }), 4200);
  };
  toast = (text) => this.notify('info', '', text);
  invokeHost = (actionId, payload) => {
    const cap = this.capability(actionId);
    const callbacks = (this.props && this.props.hostCallbacks) || {};
    const fn = callbacks[actionId];
    if (!cap.enabled || typeof fn !== 'function') {
      this.notify('warning', 'Action unavailable', cap.reason);
      return Promise.resolve({ ok:false, unavailable:true, reason:cap.reason });
    }
    this.setState({ operationState:'loading', operationAction:actionId, operationReceipt:null });
    this.notify('progress', 'Operation submitted', 'Waiting for a host receipt before reporting an outcome.');
    return Promise.resolve(fn(payload || {})).then(receipt => {
      if (!receipt || receipt.ok !== true || !receipt.id) {
        const reason = receipt && receipt.reason ? receipt.reason : 'The host returned no verified success receipt.';
        this.setState({ operationState:'unavailable', operationReceipt:null });
        this.notify('error', 'Operation not verified', reason);
        return { ok:false, reason };
      }
      this.setState({ operationState:'verified', operationReceipt:receipt });
      this.notify('success', 'Operation verified', receipt.summary || 'The host confirmed completion.', receipt);
      return receipt;
    }).catch(error => {
      const reason = error && error.message ? error.message : 'The host operation failed without a readable reason.';
      this.setState({ operationState:'unavailable', operationReceipt:null });
      this.notify('error', 'Operation failed', reason);
      return { ok:false, reason };
    });
  };
  hostMenuAction = (icon, label, actionId, payload, close) => {
    const cap = this.capability(actionId);
    return {
      icon, label, disabled:!cap.enabled, reason:cap.reason,
      run:() => {
        if (close) close();
        if (!cap.enabled) return this.notify('warning', 'Action unavailable', cap.reason);
        return this.invokeHost(actionId, payload || {});
      }
    };
  };
  commit = () => this.notify('warning', 'History unavailable', 'Local intent is not a history entry. The host must return a durable history receipt.');
  setVal = (c, value) => this.invokeHost('settings.update', { screen:this.state.screen, settingId:c.id, value, expectedSource:(SCREENS[this.state.screen] || {}).file || 'console' }).then(receipt => {
    if (!receipt.ok) return receipt;
    this.setState(st => ({ values:Object.assign({}, st.values, { [c.id]:value }), commits:receipt.historyEntry ? [receipt.historyEntry].concat(st.commits || []).slice(0, 400) : (st.commits || []) }));
    this.onUserMutation('control:' + (c.id || 'unknown'));
    return receipt;
  });

  showDoc = (c) => {
    this._lastCtl = c;
    const d = this.docFor(c);
    this.setState({ infoOpen:true, infoDoc:d, infoTitle:c.label, infoKey:c.id,
      infoBody:d.summary, infoPlain:d.plainWords, infoX:'44%', infoY:'110px' });
    return true;
  };

  rememberFocus = () => { this._focusOrigin = document.activeElement; };
  restoreFocus = () => { const target=this._focusOrigin; this._focusOrigin=null; setTimeout(() => { if (target && typeof target.focus === 'function') target.focus(); }, 0); };

  showInfo = (title, body, plain, x, y) => { this.rememberFocus(); this.setState({ infoOpen:true, infoTitle:title, infoBody:body, infoPlain:plain || 'Nothing here can break a live call on its own. Changing it only takes effect after you clear the confirmation gates.', infoX:x || '46%', infoY:y || '170px' }); };

  ceremony = (title, actionId, payload) => { this.rememberFocus(); this.setState({ ceremonyOpen:true, ceremonyTitle:title, ceremonyCmd:actionId, ceremonyBody:'Review the exact operation. Two independent keys and the full slider authorize submission, but only a host receipt establishes the result.', operationPayload:payload || {}, operationState:'idle', operationReceipt:null, confirmKeyOne:false, confirmKeyTwo:false, slideVal:0 }); };

  componentWillUnmount() { clearInterval(this._reroll); window.removeEventListener('mousemove', this._mm); window.removeEventListener('mouseup', this._mu); window.removeEventListener('keydown', this._key); clearInterval(this._hold); clearInterval(this._mole); clearTimeout(this._tt); clearInterval(this._g); clearInterval(this._oc); clearTimeout(this._cf); }

  areYouSure = (title, body, need, action) => this.setState({ sureOpen:true, sureTitle:title, sureBody:body, sureNeed:need || 3, sureHits:0, sureCell:Math.floor(Math.random() * 8), sureAction:action });

  answerAuth = (r, ans) => {
    const submit = () => this.invokeHost('auth.answer', { requestId:r.id, answer:ans }).then(receipt => {
      if (!receipt.ok) return receipt;
      this.setState({ authAnswers:Object.assign({}, this.state.authAnswers, { [r.id]:ans }) });
      return receipt;
    });
    if (ans === 'YES' && r.risk === 'High risk') {
      return this.areYouSure('Sending YES to ' + r.partner, 'You are about to tell ' + r.partner + ' that ' + r.title.toLowerCase() + ' is approved. This widens who may deliver calls onto your PBX and it takes effect on their side within minutes.', 4, () => {
        submit();
      });
    }
    return submit();
  };

  openScreen = (k) => this.setState(st => ({ rndNonce:st.rndNonce + 1, screen:k, railId:SCREENS[k] ? SCREENS[k].rail : st.railId }));

  componentDidMount() {
    this._reroll = setInterval(() => { if (this.state.values.fun_random === true && this.state.values.fun_random_reroll === true) this.setState(st => ({ rndNonce:st.rndNonce + 1 })); }, 2600);
    this._mm = (e) => {
      const rz = this.state.resize;
      if (rz) {
        const sizes = Object.assign({}, this.state.dlgSize);
        sizes[rz.key] = { w:Math.max(300, Math.round(rz.w + (e.clientX - rz.x))), h:Math.max(220, Math.round(rz.h + (e.clientY - rz.y))) };
        this.onUserMutation('layout:resize');
        return this.setState({ dlgSize:sizes });
      }
      const d = this.state.drag;
      if (!d) return;
      const pos = Object.assign({}, this.state.dlgPos);
      pos[d.key] = { x:(e.clientX - d.dx) + 'px', y:(e.clientY - d.dy) + 'px' };
      this.onUserMutation('layout:move');
      this.setState({ dlgPos:pos });
    };
    this._mu = () => { if (this.state.drag || this.state.resize) this.setState({ drag:null, resize:null }); };
    window.addEventListener('mousemove', this._mm);
    window.addEventListener('mouseup', this._mu);
    this._key = (e) => {
      if (e.key !== 'Escape') return;
      this.setState({ ceremonyOpen:false, ctxOpen:false, regexOpen:false, infoOpen:false, wizardOpen:false, lockOpen:false, appearOpen:false, tabFilterOpen:false, renameOpen:false, tabColourOpen:false, paletteOpen:false });
      this.restoreFocus();
    };
    window.addEventListener('keydown', this._key);
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
        pick:() => { this.setState(st => ({ dlgDock:Object.assign({}, st.dlgDock, { [key]:o.v }) })); this.onUserMutation('layout:dock'); }
      })),
      floating:mode === 'float'
    };
  };

  ownerFile(c) {
    const id = c.id || '';
    const map = { e_:'pjsip.conf', t_:'pjsip.conf', w_:'pjsip.conf', q_:'queues.conf', wq_:'queues.conf', v_:'voicemail.conf', wv_:'voicemail.conf', i_:'extensions.conf', wi_:'extensions.conf', dp_:'extensions.conf', c_:'confbridge.conf', h_:'musiconhold.conf', k_:'codecs.conf', r_:'rtp.conf', d_:'cdr.conf', l_:'cel.conf', a_:'manager.conf', mo_:'modules.conf', g_:'logger.conf', s_:'acl.conf · stir_shaken.conf', ws_:'acl.conf · stir_shaken.conf', sv_:'connection profile', ob_:'connection profile', bs_:'provisioning', ta_:'pjsip.conf', hi_:'.git config', y_:'agent memory', u_:'skills', b_:'status hub', n_:'vocabulary', o_:'release', x_:'secret intake', nt_:'console', p_:'console settings', z_:'console', fun_:'console profile', mo2_:'console profile', ly_:'console profile', th_:'console profile', bh_:'console profile', pr_:'console profile', ap_:'appearance overrides', cp_:'appearance overrides', lk_:'lock store' };
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
    const fun = this.state.values.fun_level === undefined ? 2 : this.state.values.fun_level;
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
    this.onUserMutation('appearance:random');
  };

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

  applyColour = (val) => {
    const key = this.state.renameKey || '';
    const colour = val === 'rainbow' ? 'hsl(148 60% 62%)' : val;
    if (key.indexOf('group:') === 0) {
      const id = key.slice(6);
      this.setState(st => ({ groups:st.groups.map(g => g.id === id ? Object.assign({}, g, { colour }) : g), tabColourOpen:false }));
    } else {
      this.setState(st => ({ tabColours:Object.assign({}, st.tabColours, { [key]:colour }), tabColourOpen:false }));
    }
    this.onUserMutation('appearance:colour');

  };

  tryUnlock = () => {
    const s = this.state;
    const L = s.locks[s.unlockKey];
    if (!L) return this.setState({ unlockOpen:false });
    const m = L.method || 'PIN';
    if (m.indexOf('PIN') >= 0 && s.unlockPin !== L.pin) { this.setState({ unlockPin:'' }); return this.notifyWarning('Wrong PIN — the surface stays locked'); }
    if (m.indexOf('Password') >= 0 && (s.unlockPw || '') !== L.password) { this.setState({ unlockPw:'' }); return this.notifyWarning('Wrong passphrase — the surface stays locked'); }
    const n = Object.assign({}, s.locks); delete n[s.unlockKey];
    this.setState({ locks:n, unlockOpen:false, unlockPin:'', unlockPw:'' });
    this.onUserMutation('lock:unlock');

  };

  addEdgeFrom = () => { this.setState(st => ({ edgeList:st.edgeList.concat([[st.nodeId, 'n4']]) })); this.onUserMutation('canvas:edge'); this.notifyInfo('Connection added — pick its target in the inspector'); };

  moveNode = (id, dx, dy) => {
    const base = NODES.find(n => n.id === id);
    const cur = this.state.nodePos[id] || { x:base.x, y:base.y };
    const snap = this.state.snap ? 20 : 1;
    const pos = Object.assign({}, this.state.nodePos);
    pos[id] = { x:Math.max(0, Math.round((cur.x + dx) / snap) * snap), y:Math.max(0, Math.round((cur.y + dy) / snap) * snap) };
    this.setState({ nodePos:pos });
    this.onUserMutation('canvas:move');
  };

  bulk = (verb, sel) => { this.setState({ selected:[] }); };

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
      o.dec = () => { const cur = this.val(c); this.setVal(c, Math.max(c.min, cur - 1)); };
      o.inc = () => { const cur = this.val(c); this.setVal(c, Math.min(c.max, cur + 1)); };
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
      if (kind !== 'Local') L.push('host = ' + (this.v('sv_host', '') || '—'));
      if (kind.indexOf('Docker') >= 0) L.push('container = ' + (this.v('sv_container', '') || '—'));
      if (kind.indexOf('SSH') >= 0) L.push('ssh_user = ' + (this.v('sv_user', '') || '—'), 'ssh_port = ' + this.v('sv_sshport', 22), 'ssh_key = ' + (this.v('sv_key', '') || '—'), 'strict_host_key = ' + (this.v('sv_hostkey', true) ? 'yes' : 'no'));
      L.push('interface = ' + this.v('sv_iface', 'AMI'), 'manager_port = ' + this.v('sv_amiport', 5038), 'tls = ' + (this.v('sv_tls', true) ? 'yes' : 'no'), 'config_dir = ' + this.v('sv_conf', '/etc/asterisk'));
      return L.join('\n');
    }
    if (sc === 'queues') {
      return '[' + this.v('wq_kind', 'Support').toLowerCase() + ']\nstrategy = ' + this.v('wq_strategy', 'ringall') + '\ntimeout = ' + this.v('wq_timeout', 15) + '\nwrapuptime = ' + this.v('wq_wrapup', 15) + '\nringinuse = ' + (this.v('wq_ringinuse', false) ? 'yes' : 'no') + '\nmusicclass = ' + this.v('wq_moh', 'default') + '\n' + (this.v('wq_members', [])).map(m => 'member => PJSIP/' + m).join('\n');
    }
    if (WIZARDS[sc] === WIZARDS.endpoints || sc === 'endpoints') {
      const endpointName = this.v('w_name', '');
      if (!endpointName) return '; endpoint preview unavailable until a verified host identity is selected';
      return '[' + endpointName + ']\ntype = endpoint\ntransport = ' + this.v('w_transport', 'transport-tls') + '\ncontext = ' + this.v('w_context', 'from-internal') + '\nallow = ' + this.v('w_codecs', ['opus', 'g722', 'ulaw']).join(',') + '\nmedia_encryption = ' + (this.v('w_encrypt', true) ? 'sdes' : 'no') + '\ndirect_media = ' + (this.v('w_direct', false) ? 'yes' : 'no') + '\ndtmf_mode = ' + this.v('w_dtmf', 'rfc4733') + '\n\n[' + endpointName + ']\ntype = aor\nmax_contacts = ' + this.v('w_maxcontacts', 1) + '\nqualify_frequency = ' + this.v('w_qualify', 60);
    }
    return '; goal = ' + this.v('wd_goal', 'Recommended defaults') + '\n; scope = ' + this.v('wd_scope', 'This object') + '\n; strictness = ' + this.v('wd_level', 3) + '/5';
  }

  applyChangelogPreset = (days) => {
    const end = new Date();
    const start = new Date(end.getTime() - Math.max(0, Number(days) || 0) * 86400000);
    this.setState({ changelogFrom:start.toISOString().slice(0, 10), changelogTo:end.toISOString().slice(0, 10) });
  };
  applyChangelogYear = () => this.setState({ changelogFrom:new Date().getFullYear() + '-01-01', changelogTo:new Date().toISOString().slice(0, 10) });
  copyChangelog = () => this.invokeHost('changelog.copy', { from:this.state.changelogFrom || '', to:this.state.changelogTo || '', query:this.state.changelogQuery || '' });
  exportChangelog = () => this.invokeHost('changelog.export', { from:this.state.changelogFrom || '', to:this.state.changelogTo || '', query:this.state.changelogQuery || '' });

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
    const sel = s.selected || [];
    const host = this.hostSnapshot();
    const hostScreen = (host.screens && host.screens[s.screen]) || {};
    const tableSnapshot = hostScreen.table || { state:'unavailable', rows:[], reason:'The host has not supplied this screen data.' };
    const tbl = Object.assign({}, sc.table || { cols:[], rows:[], grid:'1fr', add:'Add' }, { rows:Array.isArray(tableSnapshot.rows) ? tableSnapshot.rows : [] });
    const tableState = tableSnapshot.state || (tbl.rows.length ? 'verified' : 'unavailable');
    const tableStateMap = {
      loading:{ icon:'progress_activity', title:'Loading verified host data', body:'Rows stay blank until the host read completes.', bg:'#1B211C', fg:'#C4CBC2' },
      empty:{ icon:'inbox', title:'Verified empty', body:'The host completed the read and returned no records.', bg:'#141A15', fg:'#C4CBC2' },
      unavailable:{ icon:'cloud_off', title:'Data unavailable', body:tableSnapshot.reason || 'The host did not provide a readable source.', bg:'#2B2020', fg:'#FFB4AB' },
      partial:{ icon:'warning', title:'Partial data', body:tableSnapshot.reason || 'Some records or fields could not be read. Unread cells use an em dash.', bg:'#3A2A12', fg:'#FFD68A' },
      stale:{ icon:'history', title:'Stale cached data', body:tableSnapshot.reason || ('Last verified read: ' + (tableSnapshot.lastVerifiedAt || 'unknown') + '.'), bg:'#3A2A12', fg:'#FFD68A' },
      verified:{ icon:'verified', title:'Verified host data', body:'The host supplied these rows with a verified read receipt.', bg:'#1B4D33', fg:'#9FF7C4' }
    };
    const tableNotice = tableStateMap[tableState] || tableStateMap.unavailable;
    const connection = host.connection || { state:'unavailable', label:'No verified connection', uptime:'—', reason:'The host has not supplied a connection record.' };
    const historyEntries = host.history && Array.isArray(host.history.entries) ? host.history.entries : [];
    const chipOK = { 'Reachable':1, 'Registered':1, 'Running':1, 'Up':1, 'Active':1, 'Connected':1, 'Signed':1, 'Enabled':1, 'Published':1, 'Sealed':1, 'Locked':1 };

    return {
      shellCapabilitySummary:host.status === 'verified' ? 'Host state verified' : 'Host actions fail closed until wired',
      connLabel:connection.label || 'No verified connection', connUptime:connection.uptime || '—',
      connectionColour:connection.state === 'verified' ? '#82D9A5' : (connection.state === 'loading' ? '#FFD68A' : '#FFB4AB'),
      connectionDisabled:connection.state !== 'verified',
      connectionReason:connection.reason || '',
      openConnection:() => this.showInfo('Connection', connection.summary || connection.reason || 'No verified connection data is available.', 'Connection facts come from the host. This shell never invents a target, protocol, port, security state, or uptime.', '38%', '70px'),
      modeOpts:['Beginner','Expert'].map(m => ({ label:m, on:s.mode === m, off:s.mode !== m, pick:() => this.setState({ mode:m }) })),
      togglePalette:() => this.set('paletteOpen', !s.paletteOpen),
      startOnboarding:() => this.setState({ onboardOpen:true, onboardStep:0 }),

      rail:RAIL.map(r => ({ icon:r.icon, label:r.label, on:r.id === s.railId, off:r.id !== s.railId, pick:() => this.setState({ railId:r.id, screen:ORDER.find(k => SCREENS[k].rail === r.id) }) })),
      groupLabel:railDef.groupLabel, groupDesc:railDef.groupDesc,
      sections:secIds.map(k => { const hs = (host.screens && host.screens[k]) || {}; return { label:SCREENS[k].label, icon:SCREENS[k].icon, badge:hs.count === undefined ? '—' : String(hs.count), on:k === s.screen, off:k !== s.screen, pick:() => this.openScreen(k) }; }),
      dirtyLabel:(host.changeState && host.changeState.label) || 'Change state unavailable',

      screenKey:s.screen + ':' + s.railId + ':' + s.mode,
      beginner:s.mode === 'Beginner', expertMode:s.mode === 'Expert',
      expertLine:'edits ' + (sc.file || 'the console profile') + ' · branch ' + s.branch + ' · commit on write ' + (this.v('hi_commit', true) ? 'on' : 'off'),
      expertCount:(() => { let n = 0; (sc.groups || []).forEach(g => { n += g.ctls.length; }); return n + ' options'; })(),
      hiddenCount:(() => { let n = 0; (sc.groups || []).forEach(g => g.ctls.forEach(x => { if (ADVANCED.indexOf(x.id) >= 0) n++; })); return n + ' advanced options are hidden'; })(),
      beginnerNote:(() => {
        const notes = { servers:'You do not need to understand any of this. Press the big green button and answer nothing.', endpoints:'An endpoint is one phone. Adding one is a five-question wizard.', queues:'A queue is a waiting line for callers. The only choice that matters is who gets rung first.', canvas:'Each box is one thing that happens to a call, in order, top to bottom.', security:'The defaults here are already safe. Only change something if you know why.' };
        return notes[s.screen] || 'Available controls describe their source and handler. Unwired controls stay disabled with a reason.';
      })(),
      screenTitle:sc.title, screenFile:sc.file, screenSub:sc.sub,
      openInfoScreen:() => this.showInfo(sc.title, sc.sub, 'This screen is designed for ' + (sc.file || 'the console itself') + '. Row provenance and writable actions come from the host capability descriptors.', '46%', '150px'),
      openWizard:() => (sc.kind === 'servers' && this.onAddServer ? this.onAddServer() : this.setState({ wizardOpen:true, wizardStep:0, wizardCtl:null })),

      isDashboard:sc.kind === 'dashboard', isCanvas:sc.kind === 'canvas', isTable:sc.kind === 'table', isCli:sc.kind === 'cli', isMemory:sc.kind === 'memory', isDocs:sc.kind === 'docs', isChangelog:sc.kind === 'changelog',
      // Additive, not kind-exclusive: codecs (kind:'generic') and endpoints (kind:'table')
      // keep their own screen, this just adds a graph panel on top of it.
      isCodecGraph:s.screen === 'codecs', isEndpointGraph:s.screen === 'endpoints',
      /* The servers screen has its own hero (One Click Setup) above this, but its
       * configured connections are a real table too, so it shares the generic table
       * markup — search, filters, the add button, and every row's own context menu. */
      isTableLike:sc.kind === 'table' || sc.kind === 'servers',

      stats:(host.dashboard && Array.isArray(host.dashboard.stats) ? host.dashboard.stats : []).map((k, i) => Object.assign({}, k, { value:k.value === undefined ? '—' : k.value, delta:k.delta || 'No comparison supplied', rnd:this.rnd(40 + i) })),
      dashboardRefresh:(host.dashboard && host.dashboard.refreshLabel) || 'No verified refresh interval',
      liveCalls:(host.dashboard && Array.isArray(host.dashboard.liveCalls) ? host.dashboard.liveCalls : []).map(c => Object.assign({}, c, {
        spy:() => this.ceremony('Listen to a live call', 'calls.spy', { callId:c.id }),
        rec:() => this.ceremony('Start recording a live call', 'calls.record', { callId:c.id }),
        kill:() => this.ceremony('Hang up a live call', 'calls.hangup', { callId:c.id })
      })),
      health:(host.dashboard && Array.isArray(host.dashboard.health) ? host.dashboard.health : []).map(h => Object.assign({}, h, { value:h.value === undefined ? '—' : h.value, pct:h.pct || '0%' })),
      quickActions:(host.dashboard && Array.isArray(host.dashboard.actions) ? host.dashboard.actions : []).map(q => Object.assign({}, q, { run:() => this.ceremony(q.label, q.actionId, q.payload || {}) })),

      canvasTools:[
        { icon:'near_me', label:'Select', id:'select' }, { icon:'timeline', label:'Wire', id:'wire' },
        { icon:'pan_tool', label:'Pan', id:'pan' }, { icon:'crop_free', label:'Marquee', id:'marquee' },
        { icon:'content_cut', label:'Split', id:'split' }, { icon:'comment', label:'Comment', id:'comment' },
        { icon:'straighten', label:'Measure', id:'measure' }
      ].map(t => ({ icon:t.icon, label:t.label, on:s.canvasTool === t.id, off:s.canvasTool !== t.id, pick:() => { this.set('canvasTool', t.id); this.notifyInfo(t.label + ' tool active'); } })),
      canvasToggles:[
        { icon:'grid_on', label:'Grid', k:'grid' }, { icon:'grid_goldenratio', label:'Snap', k:'snap' },
        { icon:'straighten', label:'Guides', k:'guides' }, { icon:'map', label:'Minimap', k:'minimap' }
      ].map(t => ({ icon:t.icon, label:t.label, on:!!s[t.k], off:!s[t.k], pick:() => this.set(t.k, !s[t.k]) })),
      canvasLayers:['Dialplan', 'IVR', 'Queues', 'Annotations'].map(l => ({ label:l, on:s.layer === l, off:s.layer !== l, pick:() => this.set('layer', l) })),
      zoomLabel:s.zoom + '%',
      zoomIn:() => this.set('zoom', Math.min(200, s.zoom + 10)),
      zoomOut:() => this.set('zoom', Math.max(40, s.zoom - 10)),
      canvasBgClick:() => {},
      edges:s.edgeList.map(([a, b]) => {
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
      nodes:NODES.map(n => {
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
          ctx:(e) => { e.preventDefault(); this.rememberFocus(); this.setState({ nodeId:n.id, ctxOpen:true, ctxX:e.clientX + 'px', ctxY:e.clientY + 'px', ctxTarget:n.title, ctxKind:'node' }); },
          dup:() => { const cap=this.capability('canvas.duplicate-step'); if (!cap.enabled) return this.notify('warning', 'Action unavailable', cap.reason); return this.invokeHost('canvas.duplicate-step', { nodeId:n.id }); },
          dupDisabled:!this.capability('canvas.duplicate-step').enabled,
          dupReason:this.capability('canvas.duplicate-step').reason,
          del:() => { const cap=this.capability('canvas.delete-step'); if (!cap.enabled) return this.notify('warning', 'Action unavailable', cap.reason); return this.areYouSure('Delete ' + n.title, 'The step and every connection into or out of it are removed from the dialplan.', 3, () => this.invokeHost('canvas.delete-step', { nodeId:n.id })); },
          delDisabled:!this.capability('canvas.delete-step').enabled,
          delReason:this.capability('canvas.delete-step').reason };
      }),
      canvasDrop:(e) => {
        e.preventDefault();
        const d = s.nodeDrag; if (!d) return;
        const r = e.currentTarget.getBoundingClientRect();
        const pos = Object.assign({}, s.nodePos);
        pos[d.id] = { x:Math.max(0, Math.round(e.clientX - r.left - d.dx)), y:Math.max(0, Math.round(e.clientY - r.top - d.dy)) };
        this.setState({ nodePos:pos, nodeDrag:null });
        this.onUserMutation('canvas:drop');
      },
      canvasDragOver:(e) => e.preventDefault(),
      canvasOps:[
        { icon:'auto_awesome_mosaic', label:'Auto-arrange', run:() => { this.setState({ nodePos:{} }); this.onUserMutation('canvas:auto-arrange'); this.notifyInfo('Steps arranged left to right by call order'); } },
        { icon:'align_horizontal_left', label:'Align left', run:() => { const p = {}; NODES.forEach(n => { p[n.id] = { x:40, y:(s.nodePos[n.id] || n).y }; }); this.setState({ nodePos:p }); this.onUserMutation('canvas:align'); } },
        { icon:'vertical_distribute', label:'Distribute', run:() => { const p = {}; NODES.forEach((n, i) => { p[n.id] = { x:(s.nodePos[n.id] || n).x, y:20 + i * 66 }; }); this.setState({ nodePos:p }); this.onUserMutation('canvas:distribute'); } },
        { icon:'fit_screen', label:'Fit to view', run:() => { this.set('zoom', 100); this.onUserMutation('appearance:reset'); this.notifyInfo('Zoom reset and canvas centred'); } },
        { icon:'undo', label:'Undo layout', run:() => { this.setState({ nodePos:{} }); this.onUserMutation('canvas:undo-layout'); this.notifyInfo('Layout reverted'); } }
      ],
      edgeRows:s.edgeList.map((e, i) => ({
        from:NODES.find(n => n.id === e[0]).title, to:NODES.find(n => n.id === e[1]).title,
        fromOpts:NODES.map(n => ({ label:n.title, on:n.id === e[0], off:n.id !== e[0], pick:() => { const L = s.edgeList.map(x => x.slice()); L[i][0] = n.id; this.setState({ edgeList:L }); this.onUserMutation('canvas:edge-from'); } })),
        toOpts:NODES.map(n => ({ label:n.title, on:n.id === e[1], off:n.id !== e[1], pick:() => { const L = s.edgeList.map(x => x.slice()); L[i][1] = n.id; this.setState({ edgeList:L }); this.onUserMutation('canvas:edge-to'); } })),
        del:() => { this.setState({ edgeList:s.edgeList.filter((_, j) => j !== i) }); this.onUserMutation('canvas:edge-delete'); }
      })),
      addEdge:() => { this.setState({ edgeList:s.edgeList.concat([['n1', 'n2']]) }); this.onUserMutation('canvas:edge-add'); },
      fullscreen:s.fullscreen,
      canvasPosition:s.fullscreen ? 'fixed' : 'static',
      canvasInset:s.fullscreen ? '0' : 'auto',
      canvasZ:s.fullscreen ? 94 : 'auto',
      toggleFullscreen:() => { this.set('fullscreen', !s.fullscreen); },
      fsIcon:s.fullscreen ? 'fullscreen_exit' : 'fullscreen',
      paletteNodes:[
        { icon:'add_call', label:'Dial' }, { icon:'dialpad', label:'Menu' }, { icon:'groups', label:'Queue' }, { icon:'call_split', label:'Condition' }, { icon:'voicemail', label:'Voicemail' }
      ].map(p => ({ icon:p.icon, label:p.label, add:() => this.invokeHost('canvas.add-node', { nodeType:p.label }) })),
      nodeTitle:node.title, nodeApp:node.detail.split('\n')[0],
      nodeCtls:(NODE_CTLS[node.id] || []).map(c => Object.assign(this.buildCtl(c), { narrow:true })),

      tableCols:tbl.cols, tableGrid:tbl.grid, tableAddLabel:tbl.add,
      tableHasState:tableState !== 'verified' || tbl.rows.length === 0,
      tableStateBg:tableNotice.bg, tableStateFg:tableNotice.fg, tableStateIcon:tableNotice.icon,
      tableStateTitle:tableNotice.title, tableStateBody:tableNotice.body,
      tableFilters:['All','Healthy','Attention'].map(f => ({ label:f, on:s.tableFilter === f, off:s.tableFilter !== f, pick:() => this.set('tableFilter', f) })),
      hasSelection:sel.length > 0,
      selectionLabel:sel.length + ' of ' + tbl.rows.length + ' selected',
      allBorder:sel.length ? '#82D9A5' : '#8B938C', allBg:sel.length ? '#82D9A5' : 'transparent',
      allIcon:sel.length === tbl.rows.length && tbl.rows.length ? 'check' : (sel.length ? 'remove' : ''),
      toggleAll:() => this.set('selected', sel.length === tbl.rows.length ? [] : tbl.rows.map(r => r[0])),
      clearSelection:() => this.set('selected', []),
      bulkActions:(Array.isArray(tableSnapshot.bulkActions) ? tableSnapshot.bulkActions : []).map(action => {
        const cap = this.capability(action.actionId);
        return { icon:action.icon || 'bolt', label:action.label, disabled:!cap.enabled, reason:cap.reason, run:() => cap.enabled ? this.ceremony(action.label, action.actionId, { screen:s.screen, rowIds:sel.slice() }) : this.notify('warning', 'Action unavailable', cap.reason) };
      }),
      tableRows:tbl.rows.map(r => ({
        // This announced that the row had been loaded into the editor below and loaded
        // nothing at all — a toast asserting something that had not happened. A screen
        // that can really load a row supplies its own handler; the rest say plainly that
        // they cannot rather than claiming they did.
        pick:() => { if (this.onPickRow) { this.onPickRow(r[0]); return; }
          this.notifyWarning(r[0] + ' cannot be loaded into the editor on this screen yet'); },
        rnd:this.rnd(80 + tbl.rows.indexOf(r)),
        bg:sel.indexOf(r[0]) >= 0 ? '#1D2A22' : 'transparent',
        border:sel.indexOf(r[0]) >= 0 ? '#82D9A5' : '#8B938C',
        checkBg:sel.indexOf(r[0]) >= 0 ? '#82D9A5' : 'transparent',
        checkIcon:sel.indexOf(r[0]) >= 0 ? 'check' : '',
        toggle:() => this.set('selected', sel.indexOf(r[0]) >= 0 ? sel.filter(x => x !== r[0]) : sel.concat([r[0]])),
        ctx:(e) => { e.preventDefault(); this.rememberFocus(); this.setState({ ctxOpen:true, ctxX:e.clientX + 'px', ctxY:e.clientY + 'px', ctxTarget:r[0], ctxKind:'row' }); },
        cells:r.map((cell, i) => {
          const last = i === r.length - 1 && tbl.cols.length > 3;
          const raw = cell && typeof cell === 'object' && cell.value !== undefined ? cell.value : cell;
          const readState = cell && typeof cell === 'object' && cell.state ? cell.state : (raw === undefined || raw === null || raw === '' ? 'unread' : 'verified');
          const unread = readState !== 'verified' && (raw === undefined || raw === null || raw === '');
          const text = unread ? '—' : String(raw);
          const ok = chipOK[text];
          return { text, readState, isChip:last && !unread, isMono:!last && i === 0, isText:!last && i !== 0, bg:ok ? '#1B4D33' : '#5C1B18', fg:ok ? '#9FF7C4' : '#FFB4AB' };
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
      cliLog:Array.isArray(hostScreen.cliLog) ? hostScreen.cliLog : [{ text:'No verified command result. Run a host-backed read action to populate this surface.', color:'#8FA394' }],

      regexValue:s.regex.join(''),
      regexMatches:(host.regex && host.regex.matchCount !== undefined ? host.regex.matchCount : 0) + ' verified matches',
      regexTokens:s.regex.map((t, i) => ({ label:t, remove:() => this.set('regex', s.regex.filter((_, j) => j !== i)) })),
      regexPalette:['^', '$', '\\d+', '[a-z]+', '.*', '\\.md$', '(a|b)'].map(p => ({ label:p, add:() => this.set('regex', s.regex.concat([p])) })),
      memRows:host.memory && Array.isArray(host.memory.rows) ? host.memory.rows : [],
      memPanels:(host.memory && Array.isArray(host.memory.panels) ? host.memory.panels : []).map(panel => Object.assign({}, panel, { rows:Array.isArray(panel.rows) ? panel.rows : [], act:() => panel.actionId ? this.ceremony(panel.action || panel.title, panel.actionId, panel.payload || {}) : this.notify('warning', 'Action unavailable', 'The host did not supply an action handler descriptor.') })),

      docsQuery:'',
      setDocsQuery:(e) => this.set('docsQuery', e.target.value),
      docsRegexOn:false,
      toggleDocsRegex:() => this.set('docsRegexOn', !s.docsRegexOn),
      docsRegexBg:s.docsRegexOn ? '#005230' : 'transparent',
      docsRegexColor:s.docsRegexOn ? '#9FF7C4' : '#778078',
      docsRegexPalette:['^', '$', '\d+', '[a-z]+', '.*', '\.md$'].map(p => ({ label:p, add:() => this.set('docsQuery', (s.docsQuery || '') + p) })),
      docsQueryError:'',
      docsResultsLabel:'No verified documentation index',
      docsCategories:[],
      docsResults:[],
      docsSelectedTitle:'No verified article',
      docsSelectedCategory:'',
      docsBlocks:[{ isParagraph:true, spans:[{ isPlain:true, text:'The host did not supply a documentation index.' }] }],
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
        expanded:!g.collapsed,
        chevron:g.collapsed ? 'chevron_right' : 'expand_more',
        toggle:() => { this.setState({ groups:s.groups.map(x => x.id === g.id ? Object.assign({}, x, { collapsed:!x.collapsed }) : x) }); this.onUserMutation('group:toggle'); },
        ctx:(e) => { e.preventDefault(); this.rememberFocus(); this.setState({ ctxOpen:true, ctxSub:'', ctxGroupId:g.id, ctxX:e.clientX + 'px', ctxY:e.clientY + 'px', ctxTarget:'group · ' + g.name, ctxKind:'group' }); }
      })),
      renameOpen:s.renameOpen, renameValue:s.renameValue,
      onRename:(e) => this.set('renameValue', e.target.value),
      saveRename:() => {
        const key = s.renameKey || '';
        if (key.indexOf('group:') === 0) {
          const id = key.slice(6);
          this.setState(st => ({ groups:st.groups.map(g => g.id === id ? Object.assign({}, g, { name:st.renameValue }) : g), renameOpen:false })); this.onUserMutation('group:rename');
          return true;
        }
        this.setState(st => ({ tabNames:Object.assign({}, st.tabNames, { [key]:st.renameValue }), renameOpen:false })); this.onUserMutation('tab:rename');
        return true;
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
        return [['hsl', 'hsl(' + h + ' ' + sa + '% ' + l + '%)'], ['oklch', 'oklch(' + (l / 100).toFixed(2) + ' 0.13 ' + h + ')'], ['hsl deg', h + 'deg'], ['css var', '--tab-accent']].map(([k, v2]) => ({ label:k + ' · ' + v2, copy:() => this.invokeHost('clipboard.copy', { text:v2, source:'tab-colour-picker' }) })); })(),
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
      tabFilterInvalid:(() => { const q=s.tabFilterText || (s.patterns.nav || []).join(''); if (s.tabFilterMode === 'colour') return !s.tabFilterColour; if (!q) return true; if ((s.patterns.nav || []).length) { try { new RegExp(q, s.regexFlags.join('')); } catch (e) { return true; } } return false; })(),
      tabFilterSummary:(() => { const q=s.tabFilterText || (s.patterns.nav || []).join(''); if (s.tabFilterMode !== 'colour' && !q) return 'Enter a non-empty query. No tabs can close yet.'; const protectedCount=s.tabs.filter(k => s.pinned.indexOf(k) >= 0).length; return protectedCount + ' pinned tab' + (protectedCount === 1 ? '' : 's') + ' protected and excluded from this operation.'; })(),
      onTabFilterText:(e) => this.set('tabFilterText', e.target.value),
      openTabRegex:() => this.setState({ regexOpen:true, regexTarget:'nav', regexX:'34%', regexY:'150px' }),
      tabFilterPreview:(() => {
        if (s.tabFilterMode === 'colour') {
          return s.tabs.map(k => {
            const label = s.tabNames[k] || (SCREENS[k] ? SCREENS[k].title : k);
            const c = s.tabColours[k] || 'none';
            const pinned = s.pinned.indexOf(k) >= 0;
            const closes = !pinned && s.tabFilterColour ? c === s.tabFilterColour : false;
            return { label, icon:pinned ? 'push_pin' : (closes ? 'close' : 'check'), bg:closes ? '#5C1B18' : '#1B4D33', fg:closes ? '#FFB4AB' : '#9FF7C4' };
          });
        }
        const q = (s.tabFilterText || (s.patterns.nav || []).join('')).toLowerCase();
        return s.tabs.map(k => {
          const label = s.tabNames[k] || (SCREENS[k] ? SCREENS[k].title : k);
          let hit = q ? label.toLowerCase().indexOf(q) >= 0 : false;
          if ((s.patterns.nav || []).length && q) { try { hit = new RegExp(q, s.regexFlags.join('')).test(label); } catch (e) { hit=false; } }
          const pinned = s.pinned.indexOf(k) >= 0;
          const closes = !pinned && (s.tabFilterMode === 'not' ? !hit : hit);
          return { label, icon:pinned ? 'push_pin' : (closes ? 'close' : 'check'), bg:closes ? '#5C1B18' : '#1B4D33', fg:closes ? '#FFB4AB' : '#9FF7C4' };
        });
      })(),
      applyTabFilter:() => {
        if (s.tabFilterMode === 'colour') {
          if (!s.tabFilterColour) return this.toast('Pick a colour first');
          const keep = s.tabs.filter(k => s.pinned.indexOf(k) >= 0 || (s.tabColours[k] || 'none') !== s.tabFilterColour);
          this.setState({ tabs:keep.length ? keep : ['dash'], screen:keep.indexOf(s.screen) >= 0 ? s.screen : (keep[0] || 'dash'), tabFilterOpen:false }); this.onUserMutation('tabs:close-colour');
          return this.notify('info', 'Tabs updated', 'Matching unpinned tabs closed. Pinned tabs were retained.');
        }
        const raw = s.tabFilterText || (s.patterns.nav || []).join('');
        if (!raw) return this.notify('warning', 'Close blocked', 'Enter a non-empty query before closing tabs.');
        let regex=null;
        if ((s.patterns.nav || []).length) { try { regex=new RegExp(raw, s.regexFlags.join('')); } catch (e) { return this.notify('warning', 'Close blocked', 'The regex pattern is invalid. Fix it before closing tabs.'); } }
        const q = raw.toLowerCase();
        const keep = s.tabs.filter(k => {
          if (s.pinned.indexOf(k) >= 0) return true;
          const label = (s.tabNames[k] || (SCREENS[k] ? SCREENS[k].title : k)).toLowerCase();
          const hit = regex ? regex.test(label) : label.indexOf(q) >= 0;
          return s.tabFilterMode === 'not' ? hit : !hit;
        });
        this.setState({ tabs:keep.length ? keep : ['dash'], screen:keep.indexOf(s.screen) >= 0 ? s.screen : (keep[0] || 'dash'), tabFilterOpen:false }); this.onUserMutation('tabs:close-filter');
        this.notify('info', 'Tabs updated', (s.tabs.length - keep.length) + ' unpinned tabs closed. Pinned tabs were retained.');
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
            this.setState({ tabs:a, tabDrag:-1, tabOver:-1 });
            this.onUserMutation('tabs:reorder');
            return;
          }
          const dragged = s.tabs[from], target = k;
          const existing = s.groups.find(g => g.tabs.indexOf(target) >= 0);
          let groups;
          if (existing) groups = s.groups.map(g => g === existing ? Object.assign({}, g, { tabs:g.tabs.concat([dragged]) }) : g);
          else groups = s.groups.concat([{ id:'g' + Date.now(), name:'New group', colour:s.tabColours[target] || '#8AB4F8', collapsed:false, tabs:[target, dragged] }]);
          this.setState({ groups, tabDrag:-1, tabOver:-1 }); this.onUserMutation('tabs:group');

        },
        on:k === s.screen, off:k !== s.screen, pinned:s.pinned.indexOf(k) >= 0, closable:s.pinned.indexOf(k) < 0,
        go:() => this.setState({ screen:k, railId:SCREENS[k] ? SCREENS[k].rail : s.railId }),
        close:(e) => { if (e && e.stopPropagation) e.stopPropagation(); if (s.pinned.indexOf(k) >= 0) return this.notify('warning', 'Pinned tab kept', 'Unpin this tab before closing it.'); const t = s.tabs.filter(x => x !== k); this.setState({ tabs:t.length ? t : ['dash'], screen:k === s.screen ? (t[0] || 'dash') : s.screen }); this.onUserMutation('tabs:close'); },
        ctx:(e) => { e.preventDefault(); this.rememberFocus(); this.setState({ ctxOpen:true, ctxTabKey:k, ctxX:e.clientX + 'px', ctxY:e.clientY + 'px', ctxTarget:'tab · ' + (s.tabNames[k] || (SCREENS[k] ? SCREENS[k].title : k)), ctxKind:'tab' }); }
        };
      }),
      newTab:() => { const next = ORDER.find(k => s.tabs.indexOf(k) < 0) || 'dash'; this.setState({ tabs:s.tabs.concat([next]), screen:next, railId:SCREENS[next].rail }); this.onUserMutation('tabs:new'); },
      dockOpts:[
        { label:'Tabs on the left', icon:'dock_to_right', v:'left' },
        { label:'Tabs on the right', icon:'dock_to_left', v:'right' },
        { label:'Tabs on top', icon:'dock_to_bottom', v:'top' },
        { label:'Tabs on bottom', icon:'dock_to_top', v:'bottom' }
      ].map(d => ({ label:d.label, icon:d.icon, on:s.dock === d.v, off:s.dock !== d.v, pick:() => { this.set('dock', d.v); this.toast('Docked ' + d.label.toLowerCase()); } })),
      tabOrientation:s.dock === 'left' || s.dock === 'right' ? 'vertical' : 'horizontal',
      tabStripStyle:(s.dock === 'left' ? 'position:absolute; left:0; top:40px; bottom:0; width:230px; flex-direction:column; align-items:stretch; overflow-y:auto;' : (s.dock === 'right' ? 'position:absolute; right:0; top:40px; bottom:0; width:230px; flex-direction:column; align-items:stretch; overflow-y:auto;' : (s.dock === 'bottom' ? 'position:absolute; left:0; right:0; bottom:0; height:48px; align-items:center; overflow-x:auto;' : 'position:absolute; left:0; right:0; top:40px; height:48px; align-items:center; overflow-x:auto;'))) + ' display:flex; gap:4px; background:#0B0F0C; padding:4px 6px; z-index:50;',
      workspaceInsetStyle:'flex:1; display:flex; min-height:0; gap:0; flex-direction:row; ' + (s.dock === 'left' ? 'margin-left:230px;' : (s.dock === 'right' ? 'margin-right:230px;' : (s.dock === 'bottom' ? 'margin-bottom:48px;' : 'margin-top:48px;'))),
      tabSearchSlots:[
        { id:'strip', label:'Current strip tabs' },
        { id:'group', label:'Current group tabs' },
        { id:'groups', label:'Tab groups' },
        { id:'master', label:'All windows and groups' }
      ].map(slot => ({ label:slot.label, value:s.tabSearchQueries[slot.id] || '', input:(e) => this.setState(st => ({ tabSearchQueries:Object.assign({}, st.tabSearchQueries, { [slot.id]:e.target.value }) })), regex:() => this.setState({ regexOpen:true, regexTarget:'tabs:' + slot.id, regexX:'50%', regexY:'88px' }) })),
      onTabListKeyDown:(e) => {
        const vertical = s.dock === 'left' || s.dock === 'right';
        const step = vertical ? (e.key === 'ArrowDown' ? 1 : (e.key === 'ArrowUp' ? -1 : 0)) : (e.key === 'ArrowRight' ? 1 : (e.key === 'ArrowLeft' ? -1 : 0));
        if (!step) return;
        if (e.preventDefault) e.preventDefault();
        const index = s.tabs.indexOf(s.screen);
        const next = s.tabs[(index + step + s.tabs.length) % s.tabs.length];
        if (next) this.openScreen(next);
      },
      isCustomise:s.screen === 'customise',
      funLevel:(() => { const l = this.v('fun_level', 2); return String(l); })(),
      funName:['Bank','Polite','Balanced','Playful','Unhinged'][this.v('fun_level', 2)],
      funBlurb:[
        'Zero decoration. No celebration, no jokes, no confetti. Toasts state facts and nothing moves that does not have to.',
        'Quiet competence. Short confirmations, minimal motion, no jokes.',
        'The default. Celebrations for meaningful wins and security improvements, warm copy, motion that helps you follow what changed.',
        'Jokes in the copy, bolder motion, confetti for more things, and the one-click setup narrates itself.',
        'Confetti for moving a slider. Rainbow fills. An app that will not stop congratulating you. Genuinely usable, deeply unserious.'
      ][this.v('fun_level', 2)],
      funLevels:[0, 1, 2, 3, 4].map(n => ({ num:String(n), name:['Bank','Polite','Balanced','Playful','Unhinged'][n],
        desc:['nothing moves','quiet','sensible default','jokes and motion','confetti everywhere'][n],
        on:this.v('fun_level', 2) === n, off:this.v('fun_level', 2) !== n,
        pick:() => this.setVal({ id:'fun_level', label:'Fun level' }, n) })),
      funOn:this.v('fun_level', 2) > 0,
      funIcon:this.v('fun_level', 2) > 0 ? 'celebration' : 'work',
      funLabel:this.v('fun_level', 2) > 0 ? 'FUN IS ON' : 'FUN IS OFF',
      funBtnBg:this.v('fun_level', 2) > 0 ? '#9FF7C4' : 'rgba(0,0,0,.32)',
      funKnobBg:this.v('fun_level', 2) > 0 ? '#00391F' : '#1B211C',
      funKnobFg:this.v('fun_level', 2) > 0 ? '#9FF7C4' : '#8FA394',
      funKnobAnim:this.v('fun_level', 2) > 2 ? 'm3Wiggle 1.6s ease-in-out infinite' : 'none',
      funLabelFg:this.v('fun_level', 2) > 0 ? '#00391F' : '#9FF7C4',
      toggleFun:() => { const on = this.v('fun_level', 2) > 0; this.setVal({ id:'fun_level', label:'Fun level' }, on ? 0 : 3); },
      maxFun:() => { this.setState(st => ({ values:Object.assign({}, st.values, { fun_level:4, fun_random:true, fun_confetti:300, fun_copy:'Comedian', th_rainbow:true, fun_random_scope:['Colour','Radius','Shadow','Type weight','Size','Rotation','Entrance animation'], fun_random_strength:100, fun_random_reroll:true }) })); this.onUserMutation('preset:max-fun'); },
      zeroFun:() => { this.setState(st => ({ values:Object.assign({}, st.values, { fun_level:0, fun_random:false, th_rainbow:false, fun_confetti:0, fun_copy:'Terse' }) })); this.onUserMutation('preset:zero-fun'); this.toast('Fun disabled. The console is now a spreadsheet with opinions.'); },
      toggleRandom:() => { const on = this.v('fun_random', false); this.setVal({ id:'fun_random', label:'Random appearance for every element', kind:'switch' }, !on); },
      rndBtnBg:this.v('fun_random', false) ? '#1B4D33' : 'rgba(0,0,0,.24)',
      rndBtnBorder:this.v('fun_random', false) ? '#9FF7C4' : 'rgba(159,247,196,.3)',
      rndTrack:this.v('fun_random', false) ? '#9FF7C4' : '#414942',
      rndJustify:this.v('fun_random', false) ? 'flex-end' : 'flex-start',
      rndKnob:this.v('fun_random', false) ? '#00391F' : '#8B938C',
      rndFg:this.v('fun_random', false) ? '#9FF7C4' : '#DFF3E5',
      rerollNow:() => { this.setState(st => ({ rndNonce:st.rndNonce + 1 })); this.onUserMutation('appearance:reroll'); this.toast('Rerolled — every element has a new look'); },
      isServers:sc.kind === 'servers', isTrunkAuth:sc.kind === 'trunkauth', isHistory:sc.kind === 'history',
      branchName:s.branch || 'No verified branch', commitCount:historyEntries.length + ' verified commits',
      branches:(host.history && Array.isArray(host.history.branches) ? host.history.branches : []).map(b => ({ label:b.name, on:s.branch === b.name, off:s.branch !== b.name, pick:() => this.set('branch', b.name) })),
      histFilters:['All', 'pjsip.conf', 'queues.conf', 'This screen'].map(f => ({ label:f, on:s.histFilter === f, off:s.histFilter !== f, pick:() => this.set('histFilter', f) })),
      histActions:(host.history && Array.isArray(host.history.actions) ? host.history.actions : []).map(action => { const cap=this.capability(action.actionId); return { icon:action.icon || 'history', label:action.label, disabled:!cap.enabled, reason:cap.reason, run:() => cap.enabled ? this.ceremony(action.label, action.actionId, action.payload || {}) : this.notify('warning', 'Action unavailable', cap.reason) }; }),
      commitRows:historyEntries.filter(c => s.histFilter === 'All' || (s.histFilter === 'This screen' ? c.screen === s.screen : c.file === s.histFilter)).map(c => ({
        sha:c.sha, tag:c.tag, hasTag:!!c.tag,
        msg:c.file + ': ' + c.label + ' ' + c.from + ' → ' + c.to,
        meta:c.author + ' · ' + c.when + ' · ' + c.branch,
        bg:s.histSel === c.sha ? '#1D2A22' : 'transparent',
        dot:c.branch === 'main' ? '#82D9A5' : '#FFD68A',
        cmpFg:s.histCompare.indexOf(c.sha) >= 0 ? '#82D9A5' : '#778078',
        pick:() => this.set('histSel', c.sha),
        compare:(e) => { if (e && e.stopPropagation) e.stopPropagation(); const cur = s.histCompare.indexOf(c.sha) >= 0 ? s.histCompare.filter(x => x !== c.sha) : s.histCompare.concat([c.sha]).slice(-2); this.set('histCompare', cur); },
        ctx:(e) => { e.preventDefault(); this.rememberFocus(); this.setState({ ctxOpen:true, ctxSub:'', ctxX:e.clientX + 'px', ctxY:e.clientY + 'px', ctxTarget:'commit ' + c.sha, ctxKind:'row' }); }
      })),
      diffFile:(() => { const c = historyEntries.find(x => x.sha === s.histSel) || historyEntries[0]; return c ? c.file + ' @ ' + c.sha : 'no verified commit selected'; })(),
      diffLines:(() => {
        const c = historyEntries.find(x => x.sha === s.histSel) || historyEntries[0];
        if (!c) return [{ text:'No verified history receipt is available.', color:'#8FA394', bg:'transparent' }];
        return [
          { text:'@@ ' + c.file + ' @@', color:'#8AB4F8', bg:'transparent' },
          { text:'- ' + c.key + ' = ' + c.from, color:'#FFB4AB', bg:'rgba(147,0,10,.18)' },
          { text:'+ ' + c.key + ' = ' + c.to, color:'#9FF7C4', bg:'rgba(0,82,48,.28)' },
          { text:'  ; changed by ' + c.author + ' ' + c.when, color:'#8FA394', bg:'transparent' }
        ];
      })(),
      diffActions:(host.history && Array.isArray(host.history.diffActions) ? host.history.diffActions : []).map(action => { const cap=this.capability(action.actionId); return { icon:action.icon || 'history', label:action.label, bg:'#262B26', fg:'#9FF7C4', disabled:!cap.enabled, reason:cap.reason, run:() => cap.enabled ? this.ceremony(action.label, action.actionId, { commit:s.histSel }) : this.notify('warning', 'Action unavailable', cap.reason) }; }),
      blameRows:historyEntries.slice(0, 5).map(c => ({ sha:c.sha, what:c.file + ' · ' + c.label, who:c.author })),
      compareLabel:s.histCompare.length === 2 ? ('Comparing ' + s.histCompare[0] + ' with ' + s.histCompare[1] + ' — 1 file, 1 option differs.') : 'Pick two commits with the compare buttons to see everything that differs between them.',
      authRequests:(host.authRequests && Array.isArray(host.authRequests.pending) ? host.authRequests.pending : []).map(r => ({
        title:r.title, body:r.body, when:r.when, icon:r.icon,
        iconColor:r.risk === 'High risk' ? '#FFB4AB' : (r.risk === 'Medium risk' ? '#FFD68A' : '#82D9A5'),
        risk:r.risk, riskBg:r.risk === 'High risk' ? '#5C1B18' : (r.risk === 'Medium risk' ? '#4A3B18' : '#1B4D33'),
        riskFg:r.risk === 'High risk' ? '#FFB4AB' : (r.risk === 'Medium risk' ? '#FFD68A' : '#9FF7C4'),
        facts:r.facts,
        state:s.authAnswers[r.id] === 'Deferred' ? 'deferred — expires in 46h' : 'awaiting your answer',
        stateFg:s.authAnswers[r.id] === 'Deferred' ? '#FFD68A' : '#8FA394',
        yes:() => this.answerAuth(r, 'YES'),
        no:() => this.answerAuth(r, 'NO'),
        ask:() => { const cap=this.capability('auth.request-detail'); if (!cap.enabled) return this.notify('warning', 'Action unavailable', cap.reason); return this.invokeHost('auth.request-detail', { requestId:r.id, partner:r.partner }); },
        askDisabled:!this.capability('auth.request-detail').enabled,
        askReason:this.capability('auth.request-detail').reason,
        defer:() => this.setState({ authAnswers:Object.assign({}, s.authAnswers, { [r.id]:'Deferred' }) })
      })),
      authHistory:(host.authRequests && Array.isArray(host.authRequests.history) ? host.authRequests.history : []).map(r => ({
        partner:r.partner, what:r.title, answer:s.authAnswers[r.id], when:'just now',
        color:s.authAnswers[r.id] === 'YES' ? '#82D9A5' : '#FFB4AB'
      })),
      newAuthRequest:() => this.toast('Composing a request — pick the partner and what you want to change'),
      oneClickPitch:'The host must describe the exact deployment plan, target, prerequisites, and rollback route. This shell submits nothing until that plan and handler are available.',
      oneClickButton:s.operationState === 'loading' && s.operationAction === 'deployment.run' ? 'Waiting for host receipt' : 'Review host deployment plan',
      basicCtls:[
        ctl('bs_phones','How many phones?','stepper',8,{ min:1, max:500 }),
        ctl('bs_menu','Menu before a human','switch',true),
        ctl('bs_hours','Close at night','switch',true),
        ctl('bs_tls','Encrypt everything','switch',true)
      ].map(this.buildCtl),
      oneClickModes:['Funny','Very funny','Just do it quietly'].map(m => ({ label:m, on:s.oneClickMode === m, off:s.oneClickMode !== m, pick:() => this.setState({ oneClickMode:m }) })),
      oneClickRunning:s.operationState === 'loading' && s.operationAction === 'deployment.run',
      oneClickStage:(host.deployment && host.deployment.stage) || 'No host deployment plan supplied',
      oneClickPct:(host.deployment && host.deployment.progress !== undefined ? Math.max(0, Math.min(100, host.deployment.progress)) : 0) + '%',
      oneClickLog:(host.deployment && Array.isArray(host.deployment.events) ? host.deployment.events : []).map(event => ({ text:event.text || '—', ms:event.duration || '', icon:event.state === 'verified' ? 'check_circle' : (event.state === 'failed' ? 'error' : 'pending'), color:event.state === 'verified' ? '#82D9A5' : (event.state === 'failed' ? '#FFB4AB' : '#DFE4DC') })),
      runOneClick:() => this.ceremony('Run the host deployment plan', 'deployment.run', { planId:host.deployment && host.deployment.planId }),

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
        { icon:'bookmark_add', label:'Save pattern', title:'Save to the palette', capability:'search.save', run:() => this.invokeHost('search.save', { target:s.regexTarget, pattern:(s.patterns[s.regexTarget] || []).join(''), flags:s.regexFlags.slice() }) },
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
        const upd = (patch) => { this.setState({ groups:s.groups.map(x => x.id === g.id ? Object.assign({}, x, patch) : x), ctxOpen:false, ctxSub:'' }); this.onUserMutation('group:update'); };
        if (s.ctxSub === 'gcolour') return [{ icon:'colorize', label:'Open colour picker…', run:() => this.setState({ ctxOpen:false, ctxSub:'', tabColourOpen:true, renameKey:'group:' + g.id }) }]
          .concat(['#82D9A5', '#FFD68A', '#FFB4AB', '#8AB4F8', '#D8A9F0', '#DFE4DC'].map(c => ({ icon:'circle', label:c, run:() => upd({ colour:c }) })));
        if (s.ctxSub === 'gbehave') return [
          { icon:'unfold_less', label:g.collapsed ? 'Expand' : 'Collapse', run:() => upd({ collapsed:!g.collapsed }) },
          { icon:'compress', label:'Auto-collapse when inactive', run:() => upd({ auto:true }) },
          { icon:'push_pin', label:'Pin whole group', run:() => { close(); this.set('pinned', s.pinned.concat(g.tabs)); } },
          { icon:'lock', label:'Lock every tab in group', run:() => { close(); this.notifyInfo('Each tab gets its own credential in the next step'); } },
          { icon:'sync', label:'Reload every tab in group', run:() => { close(); this.ceremony('Reload group ' + g.name, 'reload ' + g.tabs.join(' ')); } },
          { icon:'visibility_off', label:'Hide from the strip', run:() => upd({ hidden:true }) }
        ];
        if (s.ctxSub === 'gtabs') return g.tabs.map(t => ({ icon:SCREENS[t] ? SCREENS[t].icon : 'tab', label:s.tabNames[t] || (SCREENS[t] ? SCREENS[t].title : t), run:() => { close(); this.openScreen(t); } }));
        if (s.ctxSub === 'gsave') return [
          this.hostMenuAction('download', 'Export group as JSON', 'tabs.group.export', { groupId:g.id, groupName:g.name, tabIds:g.tabs.slice() }, close),
          this.hostMenuAction('bookmark_add', 'Save as a workspace', 'workspace.save', { groupId:g.id, groupName:g.name, tabIds:g.tabs.slice() }, close)
        ];
        if (s.ctxSub === 'tabexport') return [
          this.hostMenuAction('download', 'Export this tab', 'tabs.export', { tabId:s.ctxTabKey || s.screen }, close),
          this.hostMenuAction('download_for_offline', 'Export all tabs', 'tabs.export-all', { tabIds:s.tabs.slice(), groupIds:s.groups.map(x => x.id) }, close),
          this.hostMenuAction('content_copy', 'Copy tab list to clipboard', 'clipboard.copy-tabs', { tabIds:s.tabs.slice(), groupIds:s.groups.map(x => x.id) }, close)
        ];
        if (s.ctxSub !== 'closetabs') return [];
        const k = s.ctxTabKey || s.screen, i = s.tabs.indexOf(k);
        return [
          { icon:'first_page', label:'To the left', run:() => { close(); this.setState({ tabs:s.tabs.slice(i) }); this.onUserMutation('tabs:close-left'); } },
          { icon:'last_page', label:'To the right', run:() => { close(); this.setState({ tabs:s.tabs.slice(0, i + 1) }); this.onUserMutation('tabs:close-right'); } },
          { icon:'tab_close_right', label:'All others', run:() => { close(); this.setState({ tabs:[k], screen:k }); this.onUserMutation('tabs:close-others'); } },
          { icon:'search', label:'Containing…', run:() => this.setState({ ctxOpen:false, ctxSub:'', tabFilterOpen:true, tabFilterMode:'has', tabFilterText:'' }) },
          { icon:'search_off', label:'Not containing…', run:() => this.setState({ ctxOpen:false, ctxSub:'', tabFilterOpen:true, tabFilterMode:'not', tabFilterText:'' }) },
          { icon:'format_color_fill', label:'By colour…', run:() => this.setState({ ctxOpen:false, ctxSub:'', tabFilterOpen:true, tabFilterMode:'colour', tabFilterText:'' }) },
          { icon:'label_off', label:'All uncoloured', run:() => { close(); this.setState({ tabs:s.tabs.filter(t => s.tabColours[t] || t === k) }); this.onUserMutation('tabs:close-uncoloured'); } },
          { icon:'push_pin', label:'All unpinned', run:() => { close(); this.setState({ tabs:s.tabs.filter(t => s.pinned.indexOf(t) >= 0 || t === k) }); this.onUserMutation('tabs:close-unpinned'); } }
        ];
      })(),
      subX:(parseInt(s.ctxX, 10) + 266) + 'px',
      subY:(parseInt(s.ctxY, 10) + 84) + 'px',
      ctxScreen:(e) => { e.preventDefault(); this.rememberFocus(); this.setState({ ctxOpen:true, ctxX:e.clientX + 'px', ctxY:e.clientY + 'px', ctxTarget:sc.title + ' · ' + (sc.file || 'console'), ctxKind:'screen' }); },
      ctxSearch:(e) => { e.preventDefault(); this.rememberFocus(); this.setState({ ctxOpen:true, ctxX:e.clientX + 'px', ctxY:e.clientY + 'px', ctxTarget:'search field', ctxKind:'search' }); },
      closeCtx:(e) => { if (e && e.preventDefault) e.preventDefault(); this.set('ctxOpen', false); this.restoreFocus(); },
      contextQuery:s.contextQuery,
      onContextQuery:(e) => this.set('contextQuery', e.target.value),
      openContextRegex:() => this.setState({ ctxOpen:false, regexOpen:true, regexTarget:'context-menu', regexX:s.ctxX, regexY:s.ctxY }),
      onContextKeyDown:(e) => { if (e.key === 'Escape') { if (e.preventDefault) e.preventDefault(); this.setState({ ctxOpen:false, ctxSub:'', contextQuery:'' }); } },
      ctxItems:(() => {
        const close = () => this.setState({ ctxOpen:false, ctxSub:'' });
        const externalLabel = /export|import|copy|workspace|authenticator|appearance|duplicate|reload|restore|branch|push|mirror|history|save pattern|save this search|move to new window|delete|pair/i;
        const decorate = (list) => list.filter(it => !s.contextQuery || String(it.label || '').toLowerCase().indexOf(s.contextQuery.toLowerCase()) >= 0).map(it => {
          const capabilityId = it.capability || ('context.' + String(it.label || '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, ''));
          const cap = this.capability(capabilityId);
          const requiresCapability = !!it.capability || externalLabel.test(it.label || '') || (it.sub && it.sub !== 'closetabs');
          const disabled = requiresCapability && !cap.enabled;
          return Object.assign({}, it, {
            disabled,
            reason:disabled ? cap.reason : '',
            bg:it.sub && s.ctxSub === it.sub ? '#333B34' : 'transparent',
            hover:() => disabled ? null : this.set('ctxSub', it.sub || ''),
            act:disabled ? (() => this.notify('warning', 'Action unavailable', cap.reason)) : (it.sub ? (() => this.set('ctxSub', it.sub)) : it.run)
          });
        });
        this._dec = decorate;
        const common = [
          { icon:'lock', label:'Lock this element…', hint:'⌃L', run:() => this.setState({ ctxOpen:false, lockOpen:true, lockTarget:s.ctxTarget, lockKey:s.screen, lockStep:0, pin:'', password:'', lockX:s.ctxX, lockY:s.ctxY }) },
          { icon:'brush', label:'Edit appearance…', hint:'⌃E', run:() => this.setState({ ctxOpen:false, appearOpen:true, appearTarget:s.ctxTarget }) },
          { icon:'help', label:'Explain this…', hint:'F1', run:() => { close(); this.showInfo(s.ctxTarget, sc.sub, null, s.ctxX, s.ctxY); } }
        ];
        if (s.ctxKind === 'group') {
          const g = s.groups.find(x => x.id === s.ctxGroupId) || { tabs:[], name:'' };
        const upd = (patch) => { this.setState({ groups:s.groups.map(x => x.id === g.id ? Object.assign({}, x, patch) : x), ctxOpen:false, ctxSub:'' }); this.onUserMutation('group:update'); };
          return decorate([
            { icon:'edit', label:'Rename group…', hint:'F2', run:() => { close(); this.setState({ renameOpen:true, renameKey:'group:' + g.id, renameValue:g.name }); } },
            { icon:'palette', label:'Group colour', hint:'▸', sub:'gcolour' },
            { icon:'tune', label:'Group behaviour', hint:'▸', sub:'gbehave' },
            { icon:'tab', label:'Tabs in group', hint:'▸', sub:'gtabs' },
            { icon:'save', label:'Save & restore', hint:'▸', sub:'gsave' },
            { icon:'unfold_less', label:g.collapsed ? 'Expand group' : 'Collapse group', hint:'', run:() => upd({ collapsed:!g.collapsed }) },
            { icon:'link_off', label:'Ungroup', hint:'', run:() => { close(); this.setState({ groups:s.groups.filter(x => x.id !== g.id) }); this.onUserMutation('group:ungroup'); } },
            { icon:'close', label:'Close group and its tabs', hint:'', run:() => { close(); this.areYouSure('Close ' + g.name, 'Every tab in this group closes. Unsaved staged changes in them are discarded.', 3, () => { const keep = s.tabs.filter(t => g.tabs.indexOf(t) < 0); this.setState({ tabs:keep.length ? keep : ['dash'], screen:keep[0] || 'dash', groups:s.groups.filter(x => x.id !== g.id) }); this.onUserMutation('group:close'); }); } },
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
            { icon:'content_copy', label:'Duplicate tab', hint:'⌃D', run:() => { close(); this.setState({ tabs:s.tabs.concat([k]) }); this.onUserMutation('tabs:duplicate'); } },
            { icon:'close', label:'Close tab', hint:'⌃W', run:() => { close(); const t = s.tabs.filter(x => x !== k); this.setState({ tabs:t.length ? t : ['dash'], screen:t[0] || 'dash' }); this.onUserMutation('tabs:close'); } },
            { icon:'save', label:'Export & import', hint:'▸', sub:'tabexport' },
            { icon:'folder', label:'Group tabs by area', hint:'', capability:'tabs.group-by-area', run:() => { close(); this.onUserMutation('tabs:group-by-area'); return this.invokeHost('tabs.group-by-area', { tabId:k }); } },
            { icon:'open_in_new', label:'Move to new window', hint:'', capability:'tabs.move-window', run:() => { close(); return this.invokeHost('tabs.move-window', { tabId:k }); } },
            { icon:'dock_to_right', label:'Dock this tab right', hint:'', run:() => { close(); this.set('dock', 'right'); } },
            { icon:'lock', label:'Lock this tab…', hint:'⌃L', run:common[0].run }
          ]);
        }
        if (s.ctxKind === 'row') {
          const name = s.ctxTarget;
          const actions = Array.isArray(tableSnapshot.rowActions) ? tableSnapshot.rowActions : [];
          return decorate([{ icon:'check_box', label:'Select this row', hint:'', run:() => { close(); this.set('selected', sel.indexOf(name) >= 0 ? sel : sel.concat([name])); } }].concat(actions.map(action => ({ icon:action.icon || 'bolt', label:action.label, hint:action.shortcut || '', capability:action.actionId, run:() => { close(); const cap=this.capability(action.actionId); if (!cap.enabled) return this.notify('warning', 'Action unavailable', cap.reason); this.ceremony(action.label, action.actionId, { screen:s.screen, rowId:name }); } }))));
        }
        if (s.ctxKind === 'search') {
          return decorate([
            { icon:'data_object', label:'Open regex builder…', hint:'⌃R', run:() => this.setState({ ctxOpen:false, regexOpen:true, regexTarget:'table', regexX:s.ctxX, regexY:s.ctxY }) },
            { icon:'match_case', label:'Match case', hint:'', run:() => { close(); this.set('regexFlags', s.regexFlags.filter(f => f !== 'i')); } },
            { icon:'select_all', label:'Whole word only', hint:'', run:() => { close(); this.toast('Whole-word matching on'); } },
            { icon:'bookmark_add', label:'Save this search', hint:'', capability:'search.save', run:() => { close(); return this.invokeHost('search.save', { target:'table', pattern:(s.patterns.table || []).join(''), flags:s.regexFlags.slice() }); } },
            { icon:'clear', label:'Clear search', hint:'⎋', run:() => { close(); const p = Object.assign({}, s.patterns); p.table = []; p.nav = []; this.setState({ patterns:p }); } },
            common[0], common[1]
          ]);
        }
        if (s.ctxKind === 'node') {
          return decorate([
            { icon:'edit', label:'Edit this step…', hint:'↵', run:() => close() },
            { icon:'timeline', label:'Connect to…', hint:'C', run:() => { close(); this.addEdgeFrom(); } },
            { icon:'content_copy', label:'Duplicate step', hint:'⌃D', capability:'canvas.duplicate-step', run:() => { close(); return this.invokeHost('canvas.duplicate-step', { nodeId:s.nodeId }); } },
            { icon:'call_split', label:'Insert condition before', hint:'', capability:'canvas.insert-condition', run:() => { close(); return this.invokeHost('canvas.insert-condition', { nodeId:s.nodeId }); } },
            { icon:'delete', label:'Delete step', hint:'⌦', capability:'canvas.delete-step', run:() => { close(); this.areYouSure('Delete this step', 'The step and its connections are removed from the dialplan.', 3, () => this.invokeHost('canvas.delete-step', { nodeId:s.nodeId })); } },
            common[0], common[1]
          ]);
        }
        return decorate([
          { icon:'data_object', label:'Search this screen with regex…', hint:'⌃R', run:() => this.setState({ ctxOpen:false, regexOpen:true, regexTarget:'nav', regexX:s.ctxX, regexY:s.ctxY }) },
          { icon:'auto_fix_high', label:'Guided wizard for this screen', hint:'', run:() => this.setState({ ctxOpen:false, wizardOpen:true, wizardStep:0 }) },
          { icon:'checklist', label:'Select all rows', hint:'⌃A', run:() => { close(); this.set('selected', (sc.table ? sc.table.rows.map(r => r[0]) : [])); } },
          { icon:'add', label:'New tab here', hint:'⌃T', run:() => { close(); this.setState({ tabs:s.tabs.concat([s.screen]) }); this.attentionTabsNewHereMarker(); } },
          { icon:'history', label:'Version history', hint:'', run:() => { close(); this.openScreen('history'); } },
          { icon:'notifications', label:'Notification centre', hint:'', run:() => { close(); this.openScreen('notifications'); } },
          { icon:'content_copy', label:'Copy as configuration', hint:'⌃C', capability:'clipboard.copy-config', run:() => { close(); return this.invokeHost('clipboard.copy-config', { screen:s.screen, nodeId:s.nodeId }); } }
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
        if (needsPin && s.pin.length < 4) return this.notifyWarning('Set at least a four-digit PIN first');
        if (needsPw && (s.password || '').length < 4) return this.notifyWarning('Set a passphrase first');
        const L = Object.assign({}, s.locks);
        L[s.lockKey] = { method:s.lockMethod, pin:s.pin, password:s.password, target:s.lockTarget };
        this.setState({ locks:L, lockOpen:false });
        this.notifyInfo(s.lockTarget + ' is locked with ' + s.lockMethod + ' — the surface is now disabled');
      },
      closeLock:() => this.set('lockOpen', false),
      pairAuthDisabled:!this.capability('authenticator.pair').enabled,
      pairAuthReason:this.capability('authenticator.pair').reason,
      pairAuth:() => this.invokeHost('authenticator.pair', { elementId:s.lockKey, method:s.lockMethod }),

      appearOpen:s.appearOpen, appearTarget:s.appearTarget,
      appearChrome:this.dockChrome('appear', '38%', '90px', 468).style,
      appearDockOpts:this.dockChrome('appear', '38%', '90px', 468).options,
      dragAppear:this.startDrag('appear'),
      appearStates:APPEAR_STATES.map(t => ({ label:t, on:s.appearState === t, off:s.appearState !== t, pick:() => this.set('appearState', t) })),
      appearGroups:APPEAR_GROUPS.map(g => ({ icon:g.icon, title:g.title, ctls:g.ctls.map(this.buildCtl) })),
      appearPreviewStyle:'font-family:' + this.v('ap_family', 'Roboto') + ',sans-serif; font-weight:' + this.v('ap_weight', '500') + '; font-size:' + this.v('ap_size', 14) + 'px; letter-spacing:' + this.v('ap_track', 0) + 'px; line-height:' + this.v('ap_lead', 1.5) + '; color:hsl(' + this.v('ap_hue', 148) + ' ' + this.v('ap_sat', 54) + '% ' + this.v('ap_light', 68) + '%); background:#141A15; border:' + this.v('ap_bw', 1) + 'px ' + this.v('ap_bs', 'solid') + ' hsl(' + this.v('ap_hue', 148) + ' ' + this.v('ap_sat', 54) + '% 34%); border-radius:' + this.v('ap_r1', 12) + 'px ' + this.v('ap_r2', 12) + 'px ' + this.v('ap_r3', 12) + 'px ' + this.v('ap_r4', 12) + 'px; padding:' + this.v('ap_pt', 12) + 'px ' + this.v('ap_pr', 16) + 'px ' + this.v('ap_pb', 12) + 'px ' + this.v('ap_pl', 16) + 'px; box-shadow:' + this.v('ap_sx', 0) + 'px ' + this.v('ap_sy', 4) + 'px ' + this.v('ap_sb', 14) + 'px ' + this.v('ap_ss', 0) + 'px rgba(0,0,0,' + (this.v('ap_sop', 45) / 100) + '); filter:blur(' + this.v('ap_blur', 0) + 'px) brightness(' + this.v('ap_bright', 100) + '%) contrast(' + this.v('ap_contrast', 100) + '%) saturate(' + this.v('ap_satf', 100) + '%) hue-rotate(' + this.v('ap_hrot', 0) + 'deg) grayscale(' + this.v('ap_grey', 0) + '%); opacity:' + (this.v('ap_alpha', 100) / 100) + '; transform:translate(' + this.v('ap_tx', 0) + 'px,' + this.v('ap_ty', 0) + 'px) scale(' + (this.v('ap_scale', 100) / 100) + ') rotate(' + this.v('ap_rot', 0) + 'deg) skew(' + this.v('ap_skew', 0) + 'deg);',
      colorValue:'hsl(' + this.v('ap_hue', 148) + ' ' + this.v('ap_sat', 54) + '% ' + this.v('ap_light', 68) + '%)',
      hueStops:Array.from({ length:24 }, (_, i) => { const h = Math.round(i * 360 / 24); return { color:'hsl(' + h + ' 70% 55%)', label:h + '°', pick:() => this.setVal({ id:'ap_hue', label:'Hue' }, h) }; }),
      shadeStops:Array.from({ length:14 }, (_, i) => { const l = 6 + i * 6.8; return { color:'hsl(' + this.v('ap_hue', 148) + ' ' + this.v('ap_sat', 54) + '% ' + Math.round(l) + '%)', pick:() => this.setVal({ id:'ap_light', label:'Lightness' }, Math.round(l)) }; }),
      colorActions:(host.appearance && Array.isArray(host.appearance.colorActions) ? host.appearance.colorActions : []).map(action => { const cap=this.capability(action.actionId); return { icon:action.icon || 'palette', label:action.label, disabled:!cap.enabled, reason:cap.reason, run:() => cap.enabled ? this.invokeHost(action.actionId, { target:s.appearTarget }) : this.notify('warning', 'Action unavailable', cap.reason) }; }),
      colorFormats:(() => { const h = this.v('ap_hue', 148), sa = this.v('ap_sat', 54), l = this.v('ap_light', 68);
        return [['hsl', 'hsl(' + h + ' ' + sa + '% ' + l + '%)'], ['oklch', 'oklch(' + (l / 100).toFixed(2) + ' 0.12 ' + h + ')'], ['hex', '#' + Math.floor(h * 0.7).toString(16).padStart(2, '0') + Math.floor(sa * 2.4).toString(16).padStart(2, '0') + Math.floor(l * 2.4).toString(16).padStart(2, '0')], ['css var', '--accent']]
          .map(([k, val]) => ({ label:k + ' · ' + val, copy:() => this.invokeHost('clipboard.copy', { text:val, source:'appearance-colour-picker' }) })); })(),
      appearActions:(host.appearance && Array.isArray(host.appearance.actions) ? host.appearance.actions : []).map(action => { const cap=this.capability(action.actionId); return { icon:action.icon || 'brush', label:action.label, disabled:!cap.enabled, reason:cap.reason, run:() => cap.enabled ? this.invokeHost(action.actionId, { target:s.appearTarget }) : this.notify('warning', 'Action unavailable', cap.reason) }; }),
      closeAppear:() => this.set('appearOpen', false),

      celebrate:s.celebrate, celebrateTitle:s.celebrateTitle, celebrateSub:s.celebrateSub,
      confetti:Array.from({ length:90 }, (_, i) => ({
        x:((i * 17 + (i % 5) * 7) % 100) + '%', size:(10 + (i % 5) * 6) + 'px',
        color:['#82D9A5', '#9FF7C4', '#FFD68A', '#FFB4AB', '#DFE4DC', '#5AC8FA', '#FF8AD8'][i % 7],
        radius:i % 3 === 0 ? '50%' : (i % 3 === 1 ? '3px' : '0'),
        dur:(1.5 + (i % 6) * 0.28) + 's', delay:((i % 11) * 0.06) + 's'
      })),

      hasDoc:!!s.infoDoc, infoKey:s.infoKey,
      docSpec:(s.infoDoc ? s.infoDoc.spec : []),
      docWhy:(s.infoDoc ? (s.infoDoc.why || s.infoDoc.whenToChange) : ''),
      docValues:(s.infoDoc ? (s.infoDoc.valuesText || 'The accepted values are listed in the reference above.') : ''),
      docGotcha:(s.infoDoc ? (s.infoDoc.gotcha || 'Nothing surprising. Change it, watch one call, change it back if it was wrong.') : ''),
      docWizard:() => { const c = s.infoDoc; this.setState({ infoOpen:false }); if (this._lastCtl) this.openCtlWizard(this._lastCtl); },
      infoOpen:s.infoOpen, infoTitle:s.infoTitle, infoBody:s.infoBody, infoPlain:s.infoPlain,
      infoX:s.infoX, infoY:s.infoY, infoDiagram:'diagram slot — drop a real screenshot or schematic here',
      closeInfo:() => { this.set('infoOpen', false); this.restoreFocus(); },

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

      confirmationShell:s.ceremonyOpen, legacyConfirmation:false,
      ceremonyOpen:s.ceremonyOpen, ceremonyTitle:s.ceremonyTitle, ceremonyBody:s.ceremonyBody, ceremonyCmd:s.ceremonyCmd,
      keyOnePressed:s.confirmKeyOne, keyTwoPressed:s.confirmKeyTwo,
      keyOneBorder:s.confirmKeyOne ? '#82D9A5' : '#414942', keyTwoBorder:s.confirmKeyTwo ? '#82D9A5' : '#414942',
      keyOneStatus:s.confirmKeyOne ? 'Key active' : 'Activate independently', keyTwoStatus:s.confirmKeyTwo ? 'Key active' : 'Activate independently',
      confirmKeyOne:() => this.set('confirmKeyOne', !s.confirmKeyOne), confirmKeyTwo:() => this.set('confirmKeyTwo', !s.confirmKeyTwo),
      sliderDisabled:!(s.confirmKeyOne && s.confirmKeyTwo),
      submitDisabled:!(s.confirmKeyOne && s.confirmKeyTwo && s.slideVal >= 100) || s.operationState === 'loading',
      onSemanticSlide:(e) => { if (!(s.confirmKeyOne && s.confirmKeyTwo)) return this.notify('warning', 'Slider unavailable', 'Activate both independent keys first.'); this.set('slideVal', Number(e.target.value)); },
      receiptTitle:s.operationState === 'verified' ? 'Verified receipt received' : (s.operationState === 'loading' ? 'Waiting for host receipt' : (s.operationState === 'unavailable' ? 'No verified receipt' : 'Not submitted')),
      receiptBody:s.operationReceipt ? (s.operationReceipt.summary || 'The host confirmed completion.') : (s.operationState === 'loading' ? 'Completion has not been reported yet.' : 'Local intent never counts as success.'),
      receiptId:s.operationReceipt && s.operationReceipt.id ? ('Receipt ' + s.operationReceipt.id) : '',
      receiptColour:s.operationState === 'verified' ? '#9FF7C4' : (s.operationState === 'unavailable' ? '#FFB4AB' : '#FFD68A'),
      onConfirmationKeyDown:(e) => { if (e.key === 'Escape') { if (e.preventDefault) e.preventDefault(); this.setState({ ceremonyOpen:false, confirmKeyOne:false, confirmKeyTwo:false, slideVal:0 }); } },
      submitConfirmedOperation:() => { if (!(s.confirmKeyOne && s.confirmKeyTwo && s.slideVal >= 100)) return this.notify('warning', 'Submission blocked', 'Activate both keys and complete the full-range slider.'); return this.invokeHost(s.ceremonyCmd, s.operationPayload); },
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
        hit:() => { const h = this.state.sureHits + 1; this.setState({ sureHits:h, sureCell:h >= this.state.sureNeed ? -1 : Math.floor(Math.random() * 8) }); } })),
      closeSure:() => this.setState({ sureOpen:false, sureHits:0, sureCell:-1 }),
      sureYes:() => { const act = this.state.sureAction; this.setState({ sureOpen:false, sureHits:0, sureCell:-1 }); if (act) act(); },
      canSkip:false,
      skipCeremony:() => this.notify('warning', 'Confirmation cannot be skipped', 'The host operation requires the semantic two-key and slider contract.'),
      cancelCeremony:() => { clearInterval(this._mole); clearInterval(this._hold); this.setState({ ceremonyOpen:false, confirmKeyOne:false, confirmKeyTwo:false, slideVal:0 }); this.restoreFocus(); },
      executeCeremony:() => this.notify('warning', 'Legacy action disabled', 'Use the host-backed semantic confirmation shell.'),

      onboardFirst:s.onboardStep === 0,
      onboardOpen:s.onboardOpen, onboardIcon:ob.icon, onboardTitle:ob.t, onboardBody:ob.b,
      onboardSteps:ONBOARD.map((o, i) => ({ label:['Start', 'Basics', 'Target', 'Safety', 'Deploy'][i], bg:i <= s.onboardStep ? '#82D9A5' : '#333B34', fg:i <= s.onboardStep ? '#9FF7C4' : '#778078' })),
      onboardCtls:ob.ctls.map(this.buildCtl),
      onboardNextLabel:s.onboardStep === ONBOARD.length - 1 ? 'Deploy it all now' : 'Next',
      easyMode:this.v('ob_ease', 'Super easy') === 'Super easy',
      superEasy:() => { this.setState(st => ({ values:Object.assign({}, st.values, { ob_intent:'Deploy a new server', ob_ease:'Super easy', ob_phones:8, ob_menu:true, ob_hours:true, ob_tls:true }), onboardOpen:false, screen:'servers', railId:'app', oneClickMode:'Funny' })); this.onUserMutation('preset:super-easy'); },
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

      toastOpen:s.toastOpen, toastText:s.toastText, toastSeverity:s.toastSeverity,
      toastBorder:{ info:'#8AB4F8', success:'#82D9A5', warning:'#FFD68A', error:'#FFB4AB', progress:'#D8A9F0' }[s.toastSeverity] || '#8AB4F8',
      dismissToast:() => this.setState({ toastOpen:false })
    };
  }
}
ConsoleShell.prototype.template = Template;
export default ConsoleShell;

export { RAIL, SCREENS, ORDER, DOCS, GAMES, NODES, EDGES, WIZARDS, ONBOARD, TOUR, CLI_STEPS, APPEAR_GROUPS, ADVANCED };

