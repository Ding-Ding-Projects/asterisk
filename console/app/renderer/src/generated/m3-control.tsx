// @ts-nocheck
/* GENERATED FILE — do not edit.
 * Produced by console/scripts/compile-design.mjs from the checked-in design reference.
 * Edit the design reference and recompile instead. */
import { DCLogic, h, F, A, R, S, fn, sty } from '../dc-runtime';
function Template(v: any) {
  return F(
    h("div", { role: `group`, "aria-labelledby": v.labelId, "aria-describedby": v.describedBy, "aria-disabled": v.isDisabled, "data-control-kind": v.ctl.kind, style: sty(`display:flex; flex-direction:column; gap:10px; min-width:0; max-width:100%;`) },
      h("div", { style: sty(`display:flex; align-items:center; gap:8px; min-width:0; flex-wrap:wrap;`) },
        (v.labelForInput ? h("label", { id: v.labelId, htmlFor: v.primaryId, style: sty(`font-size:12.5px; font-weight:500; color:#C4CBC2; min-width:0; overflow-wrap:anywhere;`) },
            S(v.ctl.label)
          ) : null),
        (v.labelForGroup ? h("span", { id: v.labelId, style: sty(`font-size:12.5px; font-weight:500; color:#C4CBC2; min-width:0; overflow-wrap:anywhere;`) },
            S(v.ctl.label)
          ) : null),
        (v.ctl.showKey ? h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:10.5px; color:#8FA394; background:#141A15; border-radius:5px; padding:3px 7px; flex:0 0 auto; overflow-wrap:anywhere;`) },
            S(v.ctl.rawKey)
          ) : null),
        (v.showInfoAction ? h("button", { type: `button`, onClick: fn(v.ctl.onInfo), "aria-label": `Explain ${S(v.ctl.label)}`, title: `Explain this setting`, style: sty(`min-width:48px; min-height:48px; border-radius:24px; background:#262B26; border:1px solid #414942; color:#82D9A5; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto; outline-offset:3px;`), className: "c-h0" },
            h("span", { "aria-hidden": `true`, style: sty(`font-size:19px;`), className: "msym" },
              "info"
            )
          ) : null),
        (v.showWizardAction ? h("button", { type: `button`, onClick: fn(v.ctl.onWizard), "aria-label": `Open guided setup for ${S(v.ctl.label)}`, title: `Walk me through this setting`, style: sty(`min-width:48px; min-height:48px; border-radius:24px; background:#262B26; border:1px solid #414942; color:#82D9A5; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto; outline-offset:3px;`), className: "c-h0" },
            h("span", { "aria-hidden": `true`, style: sty(`font-size:19px;`), className: "msym" },
              "auto_fix_high"
            )
          ) : null),
        h("div", { style: sty(`flex:1; min-width:0;`) }),
        (v.isSlider ? h("output", { htmlFor: v.primaryId, style: sty(`font-family:'Roboto Mono',monospace; font-size:12.5px; color:#82D9A5; overflow-wrap:anywhere;`) },
            S(v.sliderDisplay)
          ) : null)
      ),
      (v.showProvenance ? h("div", { id: v.provenanceId, role: `note`, style: sty(`display:flex; align-items:flex-start; gap:8px; background:#141A15; border-left:3px solid #82D9A5; border-radius:8px; padding:9px 12px; color:#C4CBC2; font-size:11.5px; line-height:1.45; overflow-wrap:anywhere;`) },
          h("span", { "aria-hidden": `true`, style: sty(`font-size:16px; color:#82D9A5; flex:0 0 auto;`), className: "msym" },
            "database"
          ),
          h("span", null,
            S(v.provenanceText)
          )
        ) : null),
      (v.showDisabledReason ? h("div", { id: v.disabledReasonId, role: `status`, "aria-live": `polite`, style: sty(`display:flex; align-items:flex-start; gap:8px; background:#2B1716; border:1px solid #633B38; border-radius:8px; padding:9px 12px; color:#FFB4AB; font-size:11.5px; line-height:1.45; overflow-wrap:anywhere;`) },
          h("span", { "aria-hidden": `true`, style: sty(`font-size:16px; flex:0 0 auto;`), className: "msym" },
            "block"
          ),
          h("span", null,
            S(v.disabledReasonText)
          )
        ) : null),
      (v.isSwitch ? h("button", { type: `button`, role: `switch`, "aria-checked": v.switchChecked, "aria-labelledby": v.labelId, "aria-describedby": v.describedBy, disabled: v.switchDisabled, onClick: fn(v.switchAction), style: sty(`display:flex; align-items:center; gap:12px; align-self:flex-start; max-width:100%; min-height:48px; background:transparent; border:1px solid transparent; border-radius:24px; padding:7px 10px; cursor:pointer; color:#C4CBC2; outline-offset:3px;`), className: "c-h1" },
          (v.switchChecked ? F(
            h("span", { "aria-hidden": `true`, style: sty(`width:52px; height:32px; border-radius:16px; background:#82D9A5; display:flex; align-items:center; justify-content:flex-end; padding:0 4px; flex:0 0 auto;`) },
              h("span", { style: sty(`width:24px; height:24px; border-radius:50%; background:#00391F; display:flex; align-items:center; justify-content:center;`) },
                h("span", { style: sty(`font-size:16px; color:#82D9A5;`), className: "msym" },
                  "check"
                )
              )
            ),
            h("span", { style: sty(`font-size:12.5px; color:#9FF7C4;`) },
              "On"
            )
          ) : null),
          (v.switchUnchecked ? F(
            h("span", { "aria-hidden": `true`, style: sty(`width:52px; height:32px; border-radius:16px; background:#262B26; border:2px solid #414942; display:flex; align-items:center; justify-content:flex-start; padding:0 5px; flex:0 0 auto;`) },
              h("span", { style: sty(`width:16px; height:16px; border-radius:50%; background:#8B938C;`) })
            ),
            h("span", { style: sty(`font-size:12.5px; color:#9AA39B;`) },
              "Off"
            )
          ) : null)
        ) : null),
      (v.isAction ? h("button", { type: `button`, onClick: fn(v.actionHandler), disabled: v.actionDisabled, "aria-disabled": v.actionDisabled, "aria-describedby": v.describedBy, style: sty(`min-height:48px; align-self:flex-start; max-width:100%; background:#82D9A5; color:#00391F; border:0; border-radius:999px; padding:10px 18px; font-family:Roboto,sans-serif; font-size:12.5px; font-weight:600; cursor:pointer; overflow-wrap:anywhere; outline-offset:3px;`), className: "c-h2" },
          S(v.actionLabel)
        ) : null),
      (v.isSegmented ? h("div", { role: `radiogroup`, "aria-labelledby": v.labelId, "aria-describedby": v.describedBy, style: sty(`display:flex; border:1px solid #414942; border-radius:18px; overflow:hidden; align-self:flex-start; max-width:100%; flex-wrap:wrap;`) },
          A(v.choices).map(($o, $o$i) => R($o$i, h("button", { type: `button`, role: `radio`, "aria-checked": $o.selected, "aria-label": $o.accessibleLabel, disabled: $o.disabled, tabIndex: $o.tabIndex, onClick: fn($o.pickSafe), style: sty(`display:flex; align-items:center; justify-content:center; gap:6px; min-width:48px; min-height:48px; max-width:100%; background:${S($o.bg)}; color:${S($o.fg)}; border:0; border-left:1px solid #414942; padding:9px 15px; font-family:Roboto,sans-serif; font-size:12.5px; font-weight:500; cursor:pointer; overflow-wrap:anywhere; outline-offset:-4px;`), className: "c-h3" },
              ($o.selected ? h("span", { "aria-hidden": `true`, style: sty(`font-size:16px;`), className: "msym" },
                  "check"
                ) : null),
              h("span", null,
                S($o.label)
              )
            )))
        ) : null),
      (v.isSegNarrow ? h("div", { role: `radiogroup`, "aria-labelledby": v.labelId, "aria-describedby": v.describedBy, style: sty(`display:flex; flex-direction:column; gap:6px; width:100%; min-width:0;`) },
          A(v.choices).map(($o, $o$i) => R($o$i, h("button", { type: `button`, role: `radio`, "aria-checked": $o.selected, "aria-label": $o.accessibleLabel, disabled: $o.disabled, tabIndex: $o.tabIndex, onClick: fn($o.pickSafe), style: sty(`display:flex; align-items:center; gap:8px; width:100%; min-height:48px; background:${S($o.bg)}; color:${S($o.fg)}; border:1px solid #414942; border-radius:10px; padding:9px 12px; font-family:Roboto,sans-serif; font-size:12.5px; font-weight:500; cursor:pointer; text-align:left; overflow-wrap:anywhere; outline-offset:3px;`), className: "c-h4" },
              h("span", { "aria-hidden": `true`, style: sty(`font-size:17px;`), className: "msym" },
                S($o.radioIcon)
              ),
              h("span", null,
                S($o.label)
              )
            )))
        ) : null),
      (v.isSelect ? h("div", { style: sty(`display:flex; flex-direction:column; gap:8px; min-width:0; max-width:100%;`) },
          h("div", { role: `search`, "aria-label": `Filter choices for ${S(v.ctl.label)}`, style: sty(`display:flex; align-items:stretch; gap:6px; min-width:0; max-width:100%; flex-wrap:wrap;`) },
            h("input", { id: v.searchId, type: `search`, value: v.filterQuery, onChange: fn(v.onFilterInput), onInput: fn(v.onFilterInput), "aria-label": `Filter ${S(v.ctl.label)} choices`, "aria-describedby": v.filterStatusId, placeholder: `Filter choices`, autoComplete: `off`, spellCheck: `false`, disabled: v.isDisabled, style: sty(`flex:1 1 180px; min-width:0; min-height:48px; background:#141A15; border:1px solid #414942; border-radius:10px; padding:10px 12px; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:13px; outline-offset:3px;`) }),
            h("button", { type: `button`, onClick: fn(v.toggleRegex), "aria-expanded": v.regexOpen, "aria-controls": v.regexPanelId, "aria-label": `Open anchored regex builder for ${S(v.ctl.label)} choices`, title: `Regex builder`, disabled: v.isDisabled, style: sty(`min-width:48px; min-height:48px; border-radius:10px; background:#262B26; border:1px solid #414942; color:#82D9A5; cursor:pointer; display:flex; align-items:center; justify-content:center; outline-offset:3px;`), className: "c-h0" },
              h("span", { "aria-hidden": `true`, style: sty(`font-size:20px;`), className: "msym" },
                "data_object"
              )
            )
          ),
          h("div", { id: v.filterStatusId, role: `status`, "aria-live": `polite`, style: sty(`font-size:11.5px; color:${S(v.filterStatusColor)}; overflow-wrap:anywhere;`) },
            S(v.filterStatus)
          ),
          (v.regexOpen ? h("div", { id: v.regexPanelId, role: `region`, "aria-label": `Regex builder for ${S(v.ctl.label)} choices`, style: sty(`align-self:flex-start; width:min(100%,520px); max-height:70vh; overflow:auto; background:#20271F; border:1px solid #414942; border-radius:14px; padding:12px; box-shadow:0 8px 24px rgba(0,0,0,.45); display:flex; flex-direction:column; gap:10px;`) },
              h("div", { style: sty(`display:flex; align-items:center; gap:8px; flex-wrap:wrap;`) },
                h("button", { type: `button`, role: `switch`, "aria-checked": v.regexEnabled, onClick: fn(v.toggleRegexMode), style: sty(`min-height:48px; background:#262B26; border:1px solid #414942; border-radius:999px; color:#C4CBC2; padding:9px 14px; cursor:pointer; outline-offset:3px;`), className: "c-h0" },
                  `Use regex filter: ${S(v.regexModeLabel)}`
                ),
                h("span", { style: sty(`font-size:11.5px; color:#8FA394;`) },
                  `Engine: ${S(v.regexEngine)}`
                )
              ),
              h("label", { htmlFor: v.regexInputId, style: sty(`font-size:11.5px; color:#C4CBC2;`) },
                "Pattern"
              ),
              h("input", { id: v.regexInputId, type: `text`, value: v.filterQuery, onChange: fn(v.onFilterInput), onInput: fn(v.onFilterInput), "aria-invalid": v.regexInvalid, "aria-describedby": v.filterStatusId, placeholder: `Type a pattern`, autoComplete: `off`, spellCheck: `false`, style: sty(`width:100%; min-height:48px; background:#141A15; border:1px solid #414942; border-radius:10px; padding:10px 12px; color:#9FF7C4; font-family:'Roboto Mono',monospace; font-size:13px; outline-offset:3px;`) }),
              h("div", { role: `group`, "aria-label": `Regex flags`, style: sty(`display:flex; flex-wrap:wrap; gap:6px;`) },
                A(v.regexFlags).map(($f, $f$i) => R($f$i, h("button", { type: `button`, "aria-pressed": $f.on, onClick: fn($f.toggle), style: sty(`min-width:48px; min-height:48px; background:${S($f.bg)}; border:1px solid #414942; border-radius:10px; color:${S($f.fg)}; padding:8px 12px; font-family:'Roboto Mono',monospace; cursor:pointer; outline-offset:3px;`), className: "c-h5" },
                    S($f.label)
                  )))
              ),
              h("div", { style: sty(`font-size:11.5px; color:#8FA394; line-height:1.45;`) },
                "The filter is local to this picker. Plain text remains the default. Invalid patterns match nothing and do not change the current value."
              )
            ) : null),
          h("div", { role: `listbox`, "aria-labelledby": v.labelId, "aria-describedby": v.describedBy, style: sty(`display:flex; flex-wrap:wrap; gap:6px; max-width:100%;`) },
            A(v.filteredChoices).map(($o, $o$i) => R($o$i, h("button", { type: `button`, role: `option`, "aria-selected": $o.selected, "aria-label": $o.accessibleLabel, disabled: $o.disabled, onClick: fn($o.pickSafe), style: sty(`display:flex; align-items:center; justify-content:center; gap:6px; min-width:48px; min-height:48px; max-width:100%; background:${S($o.bg)}; border:1px solid #414942; border-radius:10px; padding:8px 13px; color:${S($o.fg)}; font-family:'Roboto Mono',monospace; font-size:12px; font-weight:500; cursor:pointer; overflow-wrap:anywhere; outline-offset:3px;`), className: "c-h4" },
                ($o.selected ? h("span", { "aria-hidden": `true`, style: sty(`font-size:15px;`), className: "msym" },
                    "check"
                  ) : null),
                h("span", null,
                  S($o.label)
                )
              )))
          ),
          (v.noFilteredChoices ? h("div", { role: `status`, style: sty(`min-height:48px; display:flex; align-items:center; color:#9AA39B; font-size:12px;`) },
              "No choices match this filter."
            ) : null)
        ) : null),
      (v.isChips ? h("div", { role: `group`, "aria-labelledby": v.labelId, "aria-describedby": v.describedBy, style: sty(`display:flex; flex-wrap:wrap; gap:6px; max-width:100%;`) },
          A(v.choices).map(($o, $o$i) => R($o$i, h("button", { type: `button`, "aria-pressed": $o.selected, "aria-label": $o.accessibleLabel, disabled: $o.disabled, onClick: fn($o.pickSafe), style: sty(`display:flex; align-items:center; justify-content:center; gap:6px; min-width:48px; min-height:48px; max-width:100%; background:${S($o.chipBg)}; border:1px solid #414942; border-radius:10px; padding:8px 12px; color:${S($o.fg)}; font-family:Roboto,sans-serif; font-size:12px; font-weight:500; cursor:pointer; overflow-wrap:anywhere; outline-offset:3px;`), className: "c-h4" },
              ($o.selected ? h("span", { "aria-hidden": `true`, style: sty(`font-size:15px;`), className: "msym" },
                  "check"
                ) : null),
              h("span", null,
                S($o.label)
              )
            )))
        ) : null),
      (v.isStepper ? h("div", { style: sty(`display:flex; align-items:center; gap:8px; flex-wrap:wrap; max-width:100%;`) },
          h("button", { type: `button`, onClick: fn(v.decreaseAction), disabled: v.decreaseDisabled, "aria-label": `Decrease ${S(v.ctl.label)}`, style: sty(`min-width:48px; min-height:48px; border-radius:24px; background:#262B26; border:1px solid #414942; color:#C4CBC2; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto; outline-offset:3px;`), className: "c-h6" },
            h("span", { "aria-hidden": `true`, style: sty(`font-size:20px;`), className: "msym" },
              "remove"
            )
          ),
          h("input", { id: v.primaryId, type: `number`, inputMode: `decimal`, min: v.ctl.min, max: v.ctl.max, step: v.stepVal, value: v.numText, onChange: fn(v.onNumInput), onInput: fn(v.onNumInput), "aria-valuemin": v.ctl.min, "aria-valuemax": v.ctl.max, "aria-valuenow": v.ctl.value, "aria-describedby": v.describedBy, disabled: v.numberDisabled, style: sty(`width:96px; max-width:100%; min-height:48px; background:#141A15; border:1px solid #414942; border-radius:10px; padding:8px 10px; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:17px; text-align:center; outline-offset:3px;`) }),
          h("button", { type: `button`, onClick: fn(v.increaseAction), disabled: v.increaseDisabled, "aria-label": `Increase ${S(v.ctl.label)}`, style: sty(`min-width:48px; min-height:48px; border-radius:24px; background:#262B26; border:1px solid #414942; color:#C4CBC2; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto; outline-offset:3px;`), className: "c-h6" },
            h("span", { "aria-hidden": `true`, style: sty(`font-size:20px;`), className: "msym" },
              "add"
            )
          ),
          h("button", { type: `button`, onClick: fn(v.togglePad), disabled: v.numberDisabled, "aria-expanded": v.padOpen, "aria-controls": v.padId, "aria-label": `Open number pad for ${S(v.ctl.label)}`, title: `Number pad`, style: sty(`min-width:48px; min-height:48px; border-radius:10px; background:#262B26; border:1px solid #414942; color:#82D9A5; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto; outline-offset:3px;`), className: "c-h0" },
            h("span", { "aria-hidden": `true`, style: sty(`font-size:19px;`), className: "msym" },
              "dialpad"
            )
          ),
          h("span", { style: sty(`font-size:12px; color:#8FA394; overflow-wrap:anywhere;`) },
            S(v.rangeLabel)
          )
        ) : null),
      (v.isSlider ? h("div", { style: sty(`display:grid; grid-template-columns:minmax(120px,1fr) minmax(84px,110px) 48px; align-items:center; gap:8px; max-width:100%;`) },
          h("input", { id: v.primaryId, type: `range`, min: v.ctl.min, max: v.ctl.max, step: v.stepVal, value: v.ctl.value, onInput: fn(v.sliderAction), onChange: fn(v.sliderAction), "aria-valuemin": v.ctl.min, "aria-valuemax": v.ctl.max, "aria-valuenow": v.ctl.value, "aria-valuetext": v.sliderDisplay, "aria-describedby": v.describedBy, disabled: v.sliderDisabled, style: sty(`width:100%; min-width:0; min-height:48px; outline-offset:3px;`) }),
          h("input", { id: v.numberId, type: `number`, inputMode: `decimal`, min: v.ctl.min, max: v.ctl.max, step: v.stepVal, value: v.numText, onChange: fn(v.onNumInput), onInput: fn(v.onNumInput), "aria-label": `Exact value for ${S(v.ctl.label)}`, "aria-describedby": v.describedBy, disabled: v.numberDisabled, style: sty(`width:100%; min-width:0; min-height:48px; background:#141A15; border:1px solid #414942; border-radius:10px; padding:8px 9px; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:13px; text-align:center; outline-offset:3px;`) }),
          h("button", { type: `button`, onClick: fn(v.togglePad), disabled: v.numberDisabled, "aria-expanded": v.padOpen, "aria-controls": v.padId, "aria-label": `Open number pad for ${S(v.ctl.label)}`, title: `Number pad`, style: sty(`width:48px; height:48px; border-radius:10px; background:#262B26; border:1px solid #414942; color:#82D9A5; cursor:pointer; display:flex; align-items:center; justify-content:center; outline-offset:3px;`), className: "c-h0" },
            h("span", { "aria-hidden": `true`, style: sty(`font-size:18px;`), className: "msym" },
              "dialpad"
            )
          )
        ) : null),
      (v.padOpen ? h("div", { id: v.padId, role: `dialog`, "aria-modal": `false`, "aria-label": `Number pad for ${S(v.ctl.label)}`, style: sty(`width:min(100%,360px); background:#0C110D; border:1px solid #414942; border-radius:14px; padding:12px;`) },
          h("div", { style: sty(`display:flex; align-items:center; gap:8px; margin-bottom:10px; flex-wrap:wrap;`) },
            h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; letter-spacing:1px; color:#8FA394; text-transform:uppercase;`) },
              "Number pad"
            ),
            h("div", { style: sty(`flex:1;`) }),
            h("output", { "aria-live": `polite`, style: sty(`font-family:'Roboto Mono',monospace; font-size:16px; color:#9FF7C4; overflow-wrap:anywhere;`) },
              S(v.padValue)
            )
          ),
          h("div", { style: sty(`display:grid; grid-template-columns:repeat(3,minmax(48px,1fr)); gap:6px;`) },
            A(v.padKeys).map(($k, $k$i) => R($k$i, h("button", { type: `button`, onClick: fn($k.press), "aria-label": $k.accessibleLabel, style: sty(`min-width:48px; min-height:48px; border-radius:10px; background:linear-gradient(#20281F,#171D18); border:1px solid #414942; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:17px; cursor:pointer; box-shadow:0 2px 0 #0C110D; outline-offset:3px;`), className: "c-h7" },
                S($k.label)
              )))
          ),
          h("div", { style: sty(`display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;`) },
            h("button", { type: `button`, onClick: fn(v.padClear), style: sty(`flex:1 1 100px; min-height:48px; border-radius:10px; background:#262B26; border:1px solid #414942; color:#C4CBC2; font:inherit; font-size:12.5px; cursor:pointer; outline-offset:3px;`) },
              "Clear"
            ),
            h("button", { type: `button`, onClick: fn(v.padApply), disabled: v.padApplyDisabled, style: sty(`flex:2 1 160px; min-height:48px; border-radius:10px; background:#82D9A5; border:0; color:#00391F; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; outline-offset:3px;`) },
              `Set ${S(v.padValue)}`
            )
          )
        ) : null),
      (v.isOrder ? h("div", { style: sty(`display:flex; flex-direction:column; gap:8px; min-width:0; max-width:100%;`) },
          h("ol", { "aria-labelledby": v.labelId, "aria-describedby": v.describedBy, style: sty(`list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:6px; min-width:0;`) },
            A(v.dragItems).map(($i, $i$i) => R($i$i, h("li", { draggable: $i.draggable, "aria-current": $i.current, "aria-posinset": $i.position, "aria-setsize": v.orderSize, onDragStart: fn($i.onDragStart), onDragOver: fn($i.onDragOver), onDrop: fn($i.onDrop), onDragEnd: fn($i.onDragEnd), style: sty(`display:flex; align-items:center; gap:8px; min-height:48px; min-width:0; background:${S($i.bg)}; border:1px solid #333B34; border-radius:10px; padding:5px 6px 5px 12px; cursor:${S($i.cursor)};`) },
                h("span", { "aria-hidden": `true`, style: sty(`font-size:18px; color:#778078; flex:0 0 auto;`), className: "msym" },
                  "drag_indicator"
                ),
                h("span", { style: sty(`flex:1; min-width:0; font-family:'Roboto Mono',monospace; font-size:12.5px; color:#DFE4DC; overflow-wrap:anywhere;`) },
                  S($i.label)
                ),
                h("button", { type: `button`, onClick: fn($i.upSafe), disabled: $i.upDisabled, "aria-label": `Move ${S($i.label)} up`, style: sty(`min-width:48px; min-height:48px; border-radius:24px; background:transparent; border:1px solid transparent; color:#9AA39B; cursor:pointer; outline-offset:3px;`), className: "c-h8" },
                  h("span", { "aria-hidden": `true`, style: sty(`font-size:17px;`), className: "msym" },
                    "arrow_upward"
                  )
                ),
                h("button", { type: `button`, onClick: fn($i.downSafe), disabled: $i.downDisabled, "aria-label": `Move ${S($i.label)} down`, style: sty(`min-width:48px; min-height:48px; border-radius:24px; background:transparent; border:1px solid transparent; color:#9AA39B; cursor:pointer; outline-offset:3px;`), className: "c-h8" },
                  h("span", { "aria-hidden": `true`, style: sty(`font-size:17px;`), className: "msym" },
                    "arrow_downward"
                  )
                ),
                h("button", { type: `button`, onClick: fn($i.dropSafe), disabled: $i.dropDisabled, "aria-label": `Remove ${S($i.label)}`, style: sty(`min-width:48px; min-height:48px; border-radius:24px; background:transparent; border:1px solid transparent; color:#9AA39B; cursor:pointer; outline-offset:3px;`), className: "c-h9" },
                  h("span", { "aria-hidden": `true`, style: sty(`font-size:17px;`), className: "msym" },
                    "close"
                  )
                )
              )))
          ),
          h("div", { role: `group`, "aria-label": `Available items for ${S(v.ctl.label)}`, style: sty(`display:flex; flex-wrap:wrap; gap:6px;`) },
            A(v.poolItems).map(($p, $p$i) => R($p$i, h("button", { type: `button`, onClick: fn($p.addSafe), disabled: $p.disabled, "aria-label": `Add ${S($p.label)}`, style: sty(`display:flex; align-items:center; justify-content:center; gap:5px; min-width:48px; min-height:48px; max-width:100%; background:transparent; border:1px dashed #414942; border-radius:10px; padding:8px 12px; color:#9AA39B; font-family:'Roboto Mono',monospace; font-size:11.5px; cursor:pointer; overflow-wrap:anywhere; outline-offset:3px;`), className: "c-h10" },
                h("span", { "aria-hidden": `true`, style: sty(`font-size:15px;`), className: "msym" },
                  "add"
                ),
                S($p.label)
              )))
          )
        ) : null),
      (v.isTextLike ? h("div", { style: sty(`display:flex; flex-direction:column; gap:7px; min-width:0; max-width:100%;`) },
          h("div", { style: sty(`display:flex; align-items:stretch; gap:8px; min-width:0; max-width:100%; flex-wrap:wrap;`) },
            h("input", { id: v.primaryId, type: `text`, value: v.textValue, onChange: fn(v.onTextInput), onInput: fn(v.onTextInput), readOnly: v.textReadOnly, disabled: v.textDisabled, "aria-readonly": v.textReadOnly, "aria-describedby": v.describedBy, placeholder: v.textPlaceholder, autoComplete: v.textAutocomplete, spellCheck: v.textSpellcheck, style: sty(`flex:1 1 180px; min-width:0; min-height:48px; background:#141A15; border:1px solid #414942; border-radius:10px; padding:10px 12px; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:13.5px; outline-offset:3px;`) }),
            (v.showBrowseButton ? h("button", { type: `button`, onClick: fn(v.browseAction), disabled: v.browseDisabled, "aria-disabled": v.browseDisabled, "aria-describedby": v.browseCapabilityId, style: sty(`min-height:48px; max-width:100%; background:#262B26; border:1px solid #414942; border-radius:10px; color:#82D9A5; padding:9px 14px; font:inherit; font-size:12.5px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:7px; overflow-wrap:anywhere; outline-offset:3px;`), className: "c-h0" },
                h("span", { "aria-hidden": `true`, style: sty(`font-size:18px;`), className: "msym" },
                  "folder_open"
                ),
                S(v.browseLabel)
              ) : null)
          ),
          (v.showBrowseCapability ? h("div", { id: v.browseCapabilityId, role: `note`, style: sty(`font-size:11.5px; color:${S(v.browseCapabilityColor)}; line-height:1.45; overflow-wrap:anywhere;`) },
              S(v.browseCapabilityText)
            ) : null)
        ) : null),
      (v.isFile ? h("div", { style: sty(`display:flex; flex-direction:column; gap:8px; min-width:0; max-width:100%;`) },
          h("input", { id: v.primaryId, type: `file`, accept: v.ctl.accept, "aria-describedby": v.describedBy, onChange: fn(v.filePickAction), disabled: v.fileDisabled, style: sty(`width:100%; min-height:48px; background:#141A15; border:1px dashed #414942; border-radius:10px; padding:9px 12px; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:12.5px; outline-offset:3px;`) }),
          h("div", { role: `status`, "aria-live": `polite`, style: sty(`font-size:11.5px; color:#C4CBC2; overflow-wrap:anywhere;`) },
            S(v.fileStatus)
          ),
          (v.showFileClear ? h("button", { type: `button`, onClick: fn(v.fileClearAction), disabled: v.fileClearDisabled, style: sty(`align-self:flex-start; min-height:48px; max-width:100%; display:flex; align-items:center; justify-content:center; gap:7px; background:transparent; border:1px solid #414942; border-radius:10px; padding:9px 14px; color:#C4CBC2; font:inherit; font-size:12px; cursor:pointer; overflow-wrap:anywhere; outline-offset:3px;`), className: "c-h11" },
              h("span", { "aria-hidden": `true`, style: sty(`font-size:16px;`), className: "msym" },
                "close"
              ),
              "Clear loaded file"
            ) : null)
        ) : null)
    )
  );
}
class M3Control extends DCLogic {
  state = { dragFrom:-1, over:-1, padOpen:false, padBuf:'', filterQuery:'', regexOpen:false, regexEnabled:false, regexFlags:['i'] };

  renderVals() {
    const c = this.props.ctl || {};
    const st = this.state;
    const kind = String(c.kind || 'unsupported');
    const key = String(c.domId || c.id || c.label || 'control').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'control';
    const rootId = 'm3-control-' + key;
    const labelId = rootId + '-label';
    const primaryId = rootId + '-input';
    const numberId = rootId + '-number';
    const provenanceId = rootId + '-provenance';
    const disabledReasonId = rootId + '-disabled-reason';
    const browseCapabilityId = rootId + '-browse-capability';
    const searchId = rootId + '-filter';
    const filterStatusId = rootId + '-filter-status';
    const regexPanelId = rootId + '-regex-builder';
    const regexInputId = rootId + '-regex-pattern';
    const padId = rootId + '-number-pad';

    const targetBacked = c.targetBacked === true || !!c.target;
    const provenanceText = c.provenance ? String(c.provenance) : (targetBacked ? 'Source provenance was not provided.' : '');
    const missingProvenance = targetBacked && !c.provenance;
    const unsupportedReason = c.unsupportedReason ? String(c.unsupportedReason) : '';
    const explicitDisabledReason = c.disabledReason ? String(c.disabledReason) : '';
    const baseDisabledReason = unsupportedReason || explicitDisabledReason || (missingProvenance ? 'This target-backed value is disabled until its source provenance is available.' : '');
    const baseDisabled = c.disabled === true || !!unsupportedReason || !!explicitDisabledReason || missingProvenance;

    const isSwitch = kind === 'switch';
    const isAction = kind === 'action' || c.actionControl === true || !!c.action;
    const isSegmented = kind === 'segmented' && !c.narrow && !isAction;
    const isSegNarrow = kind === 'segmented' && !!c.narrow && !isAction;
    const isSelect = (kind === 'select' || kind === 'picker') && !isAction;
    const isChips = kind === 'chips';
    const isStepper = kind === 'stepper';
    const isSlider = kind === 'slider';
    const isOrder = kind === 'order';
    const isTextLike = kind === 'text' || kind === 'path';
    const isFile = kind === 'file';
    const labelForInput = isStepper || isSlider || isTextLike || isFile;
    const labelForGroup = !labelForInput;

    const actionFn = typeof c.onAction === 'function' ? c.onAction : (typeof c.run === 'function' ? c.run : (typeof c.activate === 'function' ? c.activate : null));
    const actionDisabled = baseDisabled || !actionFn;
    const actionDisabledReason = isAction && !actionFn ? 'This action is unavailable because no action handler was supplied.' : '';
    const switchFn = typeof c.toggle === 'function' ? c.toggle : (typeof c.set === 'function' ? () => c.set(!c.value) : null);
    const switchDisabled = baseDisabled || !switchFn;
    const switchDisabledReason = isSwitch && !switchFn ? 'This switch is unavailable because no value handler was supplied.' : '';

    const numberSetter = typeof c.set === 'function' ? c.set : null;
    const sliderFn = typeof c.onSlide === 'function' ? c.onSlide : null;
    const numberDisabled = baseDisabled || !numberSetter;
    const sliderDisabled = baseDisabled || (!sliderFn && !numberSetter);
    const numberDisabledReason = (isStepper || isSlider) && !numberSetter ? 'This numeric value is unavailable because no value handler was supplied.' : '';

    const textEditable = c.editable === true;
    const textSetter = typeof c.set === 'function' ? c.set : null;
    const textReadOnly = !textEditable;
    const textDisabled = baseDisabled || (textEditable && !textSetter);
    const textDisabledReason = isTextLike && textEditable && !textSetter ? 'This text value is marked editable, but no value handler was supplied.' : '';

    const browseContract = c.browseCapability ? String(c.browseCapability) : '';
    const browseFn = typeof c.onBrowse === 'function' ? c.onBrowse : null;
    const showBrowseButton = kind === 'path' || !!browseContract || !!browseFn;
    const browseSupported = c.browseSupported !== false && !!browseFn;
    const browseDisabled = baseDisabled || !browseSupported;
    const browseReason = c.browseDisabledReason ? String(c.browseDisabledReason) : (!browseContract && kind === 'path' ? 'Browse capability metadata was not supplied.' : (!browseFn && showBrowseButton ? 'No browse handler is available for this field.' : ''));
    const browseCapabilityText = browseReason || (browseContract ? 'Browse capability: ' + browseContract + '.' : '');

    const filePickFn = typeof c.onPick === 'function' ? c.onPick : null;
    const fileClearFn = typeof c.onClear === 'function' ? c.onClear : null;
    const fileDisabled = baseDisabled || !filePickFn;
    const fileDisabledReason = isFile && !filePickFn ? 'File selection is unavailable because no file handler was supplied.' : '';
    const showFileClear = !!c.hasFile;
    const fileClearDisabled = baseDisabled || !fileClearFn;
    const fileClearDisabledReason = isFile && !!c.hasFile && !fileClearFn ? 'The loaded file cannot be cleared because no clear handler was supplied.' : '';

    const disabledReasonText = baseDisabledReason || actionDisabledReason || switchDisabledReason || numberDisabledReason || textDisabledReason || fileDisabledReason || fileClearDisabledReason;
    const isDisabled = baseDisabled || !!actionDisabledReason || !!switchDisabledReason || !!numberDisabledReason || !!textDisabledReason || !!fileDisabledReason;
    const showProvenance = !!provenanceText;
    const showDisabledReason = !!disabledReasonText;
    const describedBy = [showProvenance ? provenanceId : '', showDisabledReason ? disabledReasonId : '', showBrowseButton && browseCapabilityText ? browseCapabilityId : ''].filter(Boolean).join(' ') || undefined;

    const safe = (fn) => () => { if (!baseDisabled && typeof fn === 'function') fn(); };
    const choices = (c.options || []).map((option, index) => {
      const selected = option.on === true || option.selected === true || option.value === c.value || option.label === c.value;
      const pickFn = typeof option.pick === 'function' ? option.pick : null;
      const disabled = baseDisabled || option.disabled === true || !pickFn;
      return Object.assign({}, option, {
        label:String(option.label === undefined ? '' : option.label), selected, disabled,
        tabIndex:selected || index === 0 ? 0 : -1, pickSafe:safe(pickFn),
        accessibleLabel:String(option.label === undefined ? '' : option.label) + (selected ? ', selected' : ', not selected') + (disabled ? ', unavailable' : ''),
        bg:selected ? '#005230' : 'transparent', chipBg:selected ? '#1B4D33' : 'transparent',
        fg:selected ? '#9FF7C4' : '#C4CBC2', radioIcon:selected ? 'radio_button_checked' : 'radio_button_unchecked'
      });
    });

    const flags = st.regexFlags || [];
    const filterQuery = st.filterQuery || '';
    let regex = null;
    let regexInvalid = false;
    if (st.regexEnabled && filterQuery) {
      try { regex = new RegExp(filterQuery, flags.filter(flag => flag !== 'g').join('')); }
      catch (error) { regexInvalid = true; }
    }
    const filteredChoices = regexInvalid ? [] : choices.filter(option => {
      if (!filterQuery) return true;
      if (st.regexEnabled) return regex ? regex.test(option.label) : true;
      return option.label.toLocaleLowerCase().indexOf(filterQuery.toLocaleLowerCase()) >= 0;
    });
    const filterStatus = regexInvalid ? 'Pattern is invalid. No choices are shown.' : (filteredChoices.length + ' of ' + choices.length + ' choices shown.');

    const clamp = (value) => {
      let number = parseFloat(value);
      if (isNaN(number)) return c.value;
      if (c.min !== undefined) number = Math.max(Number(c.min), number);
      if (c.max !== undefined) number = Math.min(Number(c.max), number);
      return number;
    };
    const onNumInput = (event) => {
      if (numberDisabled || !numberSetter) return;
      const raw = String(event.target.value || '').replace(/[^0-9.\-]/g, '');
      if (raw === '' || raw === '-' || raw === '.' || raw === '-.') return;
      numberSetter(clamp(raw));
    };
    const sliderAction = (event) => {
      if (sliderDisabled) return;
      if (sliderFn) sliderFn(event);
      else if (numberSetter) numberSetter(clamp(event.target.value));
    };

    const canMove = !baseDisabled && typeof c.move === 'function';
    const orderItems = c.items || [];
    const dragItems = orderItems.map((item, index) => {
      const upFn = typeof item.up === 'function' ? item.up : null;
      const downFn = typeof item.down === 'function' ? item.down : null;
      const dropFn = typeof item.drop === 'function' ? item.drop : null;
      return Object.assign({}, item, {
        label:String(item.label === undefined ? '' : item.label), position:index + 1,
        current:st.dragFrom === index ? 'true' : 'false', draggable:canMove, cursor:canMove ? 'grab' : 'default',
        bg:st.dragFrom === index ? '#005230' : (st.over === index && st.dragFrom >= 0 && st.dragFrom !== index ? '#22321F' : '#141A15'),
        upDisabled:baseDisabled || index === 0 || !upFn, downDisabled:baseDisabled || index === orderItems.length - 1 || !downFn,
        dropDisabled:baseDisabled || !dropFn, upSafe:safe(upFn), downSafe:safe(downFn), dropSafe:safe(dropFn),
        onDragStart:() => { if (canMove) this.setState({ dragFrom:index }); },
        onDragOver:(event) => { if (!canMove) return; event.preventDefault(); if (st.over !== index) this.setState({ over:index }); },
        onDrop:(event) => { if (!canMove) return; event.preventDefault(); if (st.dragFrom >= 0 && st.dragFrom !== index) c.move(st.dragFrom, index); this.setState({ dragFrom:-1, over:-1 }); },
        onDragEnd:() => this.setState({ dragFrom:-1, over:-1 })
      });
    });
    const poolItems = (c.pool || []).map(item => {
      const addFn = typeof item.add === 'function' ? item.add : null;
      return Object.assign({}, item, { disabled:baseDisabled || !addFn, addSafe:safe(addFn) });
    });

    return {
      ctl:c, labelId, primaryId, numberId, provenanceId, disabledReasonId, browseCapabilityId, searchId, filterStatusId, regexPanelId, regexInputId, padId,
      describedBy, labelForInput, labelForGroup,
      showInfoAction:typeof c.onInfo === 'function', showWizardAction:typeof c.onWizard === 'function',
      showProvenance, provenanceText, showDisabledReason, disabledReasonText, isDisabled,
      isSwitch, switchChecked:!!c.value || c.on === true, switchUnchecked:!(!!c.value || c.on === true), switchDisabled, switchAction:safe(switchFn),
      isAction, actionLabel:String(c.actionLabel || c.label || 'Run action'), actionDisabled,
      actionHandler:() => { if (!actionDisabled && actionFn) actionFn(c); },
      isSegmented, isSegNarrow, isSelect, isChips, choices, filteredChoices, noFilteredChoices:filteredChoices.length === 0,
      filterQuery, onFilterInput:(event) => this.setState({ filterQuery:String(event.target.value || '') }),
      filterStatus, filterStatusColor:regexInvalid ? '#FFB4AB' : '#8FA394', regexOpen:st.regexOpen,
      toggleRegex:() => this.setState(value => ({ regexOpen:!value.regexOpen })), regexEnabled:st.regexEnabled,
      regexModeLabel:st.regexEnabled ? 'on' : 'off', toggleRegexMode:() => this.setState(value => ({ regexEnabled:!value.regexEnabled })),
      regexInvalid, regexEngine:String(c.regexEngine || 'JavaScript RegExp'),
      regexFlags:['i','m','s','u'].map(flag => {
        const on = flags.indexOf(flag) >= 0;
        return { label:flag, on, bg:on ? '#005230' : '#262B26', fg:on ? '#9FF7C4' : '#C4CBC2',
          toggle:() => this.setState(value => ({ regexFlags:on ? value.regexFlags.filter(item => item !== flag) : value.regexFlags.concat([flag]) })) };
      }),
      isStepper, isSlider, stepVal:c.step || 1,
      rangeLabel:c.min !== undefined && c.max !== undefined ? String(c.min) + ' to ' + String(c.max) : '',
      numText:String(c.value === undefined ? '' : c.value), onNumInput,
      decreaseDisabled:baseDisabled || (typeof c.dec !== 'function' && !numberSetter), increaseDisabled:baseDisabled || (typeof c.inc !== 'function' && !numberSetter),
      decreaseAction:() => { if (baseDisabled) return; if (typeof c.dec === 'function') c.dec(); else if (numberSetter) numberSetter(clamp(Number(c.value) - Number(c.step || 1))); },
      increaseAction:() => { if (baseDisabled) return; if (typeof c.inc === 'function') c.inc(); else if (numberSetter) numberSetter(clamp(Number(c.value) + Number(c.step || 1))); },
      numberDisabled, sliderDisabled, sliderAction,
      sliderDisplay:String(c.display === undefined ? c.value === undefined ? '' : c.value : c.display),
      padOpen:st.padOpen, padValue:st.padBuf || String(c.value === undefined ? '' : c.value),
      togglePad:() => { if (!numberDisabled) this.setState(value => ({ padOpen:!value.padOpen, padBuf:'' })); },
      padKeys:['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(character => ({
        label:character, accessibleLabel:character === '⌫' ? 'Backspace' : (character === '.' ? 'Decimal point' : character),
        press:() => this.setState(value => ({ padBuf:character === '⌫' ? value.padBuf.slice(0, -1) : (value.padBuf + character).slice(0, 16) }))
      })),
      padClear:() => this.setState({ padBuf:'' }), padApplyDisabled:numberDisabled || !st.padBuf,
      padApply:() => { const value = this.state.padBuf; if (value && numberSetter && !numberDisabled) numberSetter(clamp(value)); this.setState({ padOpen:false, padBuf:'' }); },
      isOrder, orderSize:orderItems.length, dragItems, poolItems,
      isTextLike, textValue:String(c.value === undefined ? c.display === undefined ? '' : c.display : c.value), textReadOnly, textDisabled,
      onTextInput:(event) => { if (!textDisabled && textEditable && textSetter) textSetter(event.target.value); },
      textPlaceholder:String(c.placeholder || ''), textAutocomplete:String(c.autocomplete || 'off'), textSpellcheck:c.spellcheck === true,
      showBrowseButton, browseDisabled, browseAction:() => { if (!browseDisabled && browseFn) browseFn(c); },
      browseLabel:String(c.browseLabel || 'Browse'), showBrowseCapability:showBrowseButton, browseCapabilityText,
      browseCapabilityColor:browseReason ? '#FFB4AB' : '#8FA394',
      isFile, fileDisabled, filePickAction:(event) => { if (!fileDisabled && filePickFn) filePickFn(event); },
      fileStatus:String(c.fileName || c.value || 'No file chosen.'), showFileClear, fileClearDisabled,
      fileClearAction:() => { if (!fileClearDisabled && fileClearFn) fileClearFn(); }
    };
  }
}
M3Control.prototype.template = Template;
export default M3Control;


