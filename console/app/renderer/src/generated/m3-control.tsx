// @ts-nocheck
/* GENERATED FILE — do not edit.
 * Produced by console/scripts/compile-design.mjs from the checked-in design reference.
 * Edit the design reference and recompile instead. */
import { DCLogic, h, F, A, R, S, fn, sty } from '../dc-runtime';
function Template(v: any) {
  return F(
    h("div", { style: sty(`display:flex; flex-direction:column; gap:8px; min-width:0;`) },
      h("div", { style: sty(`display:flex; align-items:center; gap:7px;`) },
        h("span", { style: sty(`font-size:12.5px; font-weight:500; color:#C4CBC2;`) },
          S(v.ctl.label)
        ),
        (v.ctl.showKey ? h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:10.5px; color:#8FA394; background:#141A15; border-radius:5px; padding:2px 6px; flex:0 0 auto;`) },
            S(v.ctl.rawKey)
          ) : null),
        h("button", { onClick: fn(v.ctl.onInfo), title: `Explain this setting`, style: sty(`width:20px; height:20px; border-radius:50%; background:#262B26; border:0; color:#82D9A5; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto;`), className: "c-h0" },
          h("span", { style: sty(`font-size:14px;`), className: "msym" },
            "info"
          )
        ),
        h("button", { onClick: fn(v.ctl.onWizard), title: `Walk me through this setting`, style: sty(`width:20px; height:20px; border-radius:50%; background:#262B26; border:0; color:#82D9A5; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto;`), className: "c-h0" },
          h("span", { style: sty(`font-size:14px;`), className: "msym" },
            "auto_fix_high"
          )
        ),
        h("div", { style: sty(`flex:1;`) }),
        (v.isSlider ? h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:12.5px; color:#82D9A5;`) },
            S(v.ctl.display)
          ) : null)
      ),
      (v.isSwitch ? h("button", { onClick: fn(v.ctl.toggle), style: sty(`display:flex; align-items:center; gap:12px; background:transparent; border:0; padding:0; cursor:pointer;`) },
          (v.ctl.on ? F(
            h("span", { style: sty(`width:52px; height:32px; border-radius:16px; background:#82D9A5; display:flex; align-items:center; justify-content:flex-end; padding:0 4px;`) },
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
          (v.ctl.off ? F(
            h("span", { style: sty(`width:52px; height:32px; border-radius:16px; background:#262B26; border:2px solid #414942; display:flex; align-items:center; justify-content:flex-start; padding:0 5px;`) },
              h("span", { style: sty(`width:16px; height:16px; border-radius:50%; background:#8B938C;`) })
            ),
            h("span", { style: sty(`font-size:12.5px; color:#9AA39B;`) },
              "Off"
            )
          ) : null)
        ) : null),
      (v.isSegmented ? h("div", { style: sty(`display:flex; border:1px solid #414942; border-radius:999px; overflow:hidden; align-self:flex-start; max-width:100%; flex-wrap:nowrap;`) },
          A(v.ctl.options).map(($o, $o$i) => R($o$i, F(
            ($o.on ? h("button", { onClick: fn($o.pick), style: sty(`display:flex; align-items:center; gap:5px; background:#005230; color:#9FF7C4; border:0; padding:8px 15px; font-family:Roboto,sans-serif; font-size:12.5px; font-weight:500; cursor:pointer; white-space:nowrap;`) },
                h("span", { style: sty(`font-size:15px;`), className: "msym" },
                  "check"
                ),
                S($o.label)
              ) : null),
            ($o.off ? h("button", { onClick: fn($o.pick), style: sty(`background:transparent; color:#C4CBC2; border:0; border-left:1px solid #414942; padding:8px 15px; font-family:Roboto,sans-serif; font-size:12.5px; cursor:pointer; white-space:nowrap;`), className: "c-h1" },
                S($o.label)
              ) : null)
          )))
        ) : null),
      (v.isSegNarrow ? h("div", { style: sty(`display:flex; flex-direction:column; gap:4px;`) },
          A(v.ctl.options).map(($o, $o$i) => R($o$i, F(
            ($o.on ? h("button", { onClick: fn($o.pick), style: sty(`display:flex; align-items:center; gap:8px; width:100%; background:#005230; color:#9FF7C4; border:0; border-radius:10px; padding:9px 12px; font-family:Roboto,sans-serif; font-size:12.5px; font-weight:500; cursor:pointer; text-align:left;`) },
                h("span", { style: sty(`font-size:16px;`), className: "msym" },
                  "radio_button_checked"
                ),
                S($o.label)
              ) : null),
            ($o.off ? h("button", { onClick: fn($o.pick), style: sty(`display:flex; align-items:center; gap:8px; width:100%; background:transparent; color:#C4CBC2; border:1px solid #414942; border-radius:10px; padding:9px 12px; font-family:Roboto,sans-serif; font-size:12.5px; cursor:pointer; text-align:left;`), className: "c-h1" },
                h("span", { style: sty(`font-size:16px; color:#778078;`), className: "msym" },
                  "radio_button_unchecked"
                ),
                S($o.label)
              ) : null)
          )))
        ) : null),
      (v.isSelect ? h("div", { style: sty(`display:flex; flex-wrap:wrap; gap:6px;`) },
          A(v.ctl.options).map(($o, $o$i) => R($o$i, F(
            ($o.on ? h("button", { onClick: fn($o.pick), style: sty(`display:flex; align-items:center; gap:5px; background:#005230; border:0; border-radius:8px; padding:7px 13px; color:#9FF7C4; font-family:'Roboto Mono',monospace; font-size:12px; font-weight:500; cursor:pointer;`) },
                h("span", { style: sty(`font-size:14px;`), className: "msym" },
                  "check"
                ),
                S($o.label)
              ) : null),
            ($o.off ? h("button", { onClick: fn($o.pick), style: sty(`background:transparent; border:1px solid #414942; border-radius:8px; padding:7px 13px; color:#C4CBC2; font-family:'Roboto Mono',monospace; font-size:12px; cursor:pointer;`), className: "c-h1" },
                S($o.label)
              ) : null)
          )))
        ) : null),
      (v.isChips ? h("div", { style: sty(`display:flex; flex-wrap:wrap; gap:6px;`) },
          A(v.ctl.options).map(($o, $o$i) => R($o$i, F(
            ($o.on ? h("button", { onClick: fn($o.pick), style: sty(`display:flex; align-items:center; gap:5px; background:#1B4D33; border:1px solid #1B4D33; border-radius:8px; padding:6px 12px; color:#9FF7C4; font-family:Roboto,sans-serif; font-size:12px; font-weight:500; cursor:pointer;`) },
                h("span", { style: sty(`font-size:14px;`), className: "msym" },
                  "check"
                ),
                S($o.label)
              ) : null),
            ($o.off ? h("button", { onClick: fn($o.pick), style: sty(`background:transparent; border:1px solid #414942; border-radius:8px; padding:6px 12px; color:#9AA39B; font-family:Roboto,sans-serif; font-size:12px; cursor:pointer;`), className: "c-h2" },
                S($o.label)
              ) : null)
          )))
        ) : null),
      (v.isStepper ? h("div", { style: sty(`display:flex; align-items:center; gap:10px; flex-wrap:wrap;`) },
          h("button", { onClick: fn(v.ctl.dec), style: sty(`width:36px; height:36px; border-radius:50%; background:#262B26; border:0; color:#C4CBC2; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto;`), className: "c-h3" },
            h("span", { style: sty(`font-size:20px;`), className: "msym" },
              "remove"
            )
          ),
          h("input", { type: `text`, inputMode: `numeric`, value: v.numText, onChange: fn(v.onNumInput), onInput: fn(v.onNumInput), style: sty(`width:74px; background:#141A15; border:1px solid #414942; border-radius:10px; padding:7px 8px; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:18px; text-align:center; outline:none;`) }),
          h("button", { onClick: fn(v.ctl.inc), style: sty(`width:36px; height:36px; border-radius:50%; background:#262B26; border:0; color:#C4CBC2; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto;`), className: "c-h3" },
            h("span", { style: sty(`font-size:20px;`), className: "msym" },
              "add"
            )
          ),
          h("button", { onClick: fn(v.togglePad), title: `Number pad`, style: sty(`width:36px; height:36px; border-radius:10px; background:#262B26; border:0; color:#82D9A5; cursor:pointer; display:flex; align-items:center; justify-content:center; flex:0 0 auto;`), className: "c-h0" },
            h("span", { style: sty(`font-size:19px;`), className: "msym" },
              "dialpad"
            )
          ),
          h("span", { style: sty(`font-size:12px; color:#778078;`) },
            S(v.rangeLabel)
          )
        ) : null),
      (v.isSlider ? h("div", { style: sty(`display:flex; align-items:center; gap:10px;`) },
          h("input", { type: `range`, min: v.ctl.min, max: v.ctl.max, step: v.stepVal, value: v.ctl.value, onInput: fn(v.ctl.onSlide), onChange: fn(v.ctl.onSlide), style: sty(`flex:1; height:22px; min-width:0;`) }),
          h("input", { type: `text`, inputMode: `numeric`, value: v.numText, onChange: fn(v.onNumInput), onInput: fn(v.onNumInput), style: sty(`width:68px; background:#141A15; border:1px solid #414942; border-radius:10px; padding:6px 8px; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:13.5px; text-align:center; outline:none; flex:0 0 auto;`) }),
          h("button", { onClick: fn(v.togglePad), title: `Number pad`, style: sty(`width:32px; height:32px; border-radius:9px; background:#262B26; border:0; color:#82D9A5; cursor:pointer; flex:0 0 auto;`), className: "c-h0" },
            h("span", { style: sty(`font-size:17px;`), className: "msym" },
              "dialpad"
            )
          )
        ) : null),
      (v.padOpen ? h("div", { style: sty(`background:#0C110D; border:1px solid #333B34; border-radius:14px; padding:12px; margin-top:4px;`) },
          h("div", { style: sty(`display:flex; align-items:center; gap:8px; margin-bottom:10px;`) },
            h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:11px; letter-spacing:1px; color:#8FA394; text-transform:uppercase;`) },
              "Number pad"
            ),
            h("div", { style: sty(`flex:1;`) }),
            h("span", { style: sty(`font-family:'Roboto Mono',monospace; font-size:16px; color:#9FF7C4;`) },
              S(v.padValue)
            )
          ),
          h("div", { style: sty(`display:grid; grid-template-columns:repeat(3,1fr); gap:6px;`) },
            A(v.padKeys).map(($k, $k$i) => R($k$i, h("button", { onClick: fn($k.press), style: sty(`height:44px; border-radius:10px; background:linear-gradient(#20281F,#171D18); border:1px solid #414942; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:17px; cursor:pointer; box-shadow:0 2px 0 #0C110D;`), className: "c-h4" },
                S($k.label)
              )))
          ),
          h("div", { style: sty(`display:flex; gap:6px; margin-top:8px;`) },
            h("button", { onClick: fn(v.padClear), style: sty(`flex:1; height:36px; border-radius:10px; background:#262B26; border:0; color:#C4CBC2; font:inherit; font-size:12.5px; cursor:pointer;`) },
              "Clear"
            ),
            h("button", { onClick: fn(v.padApply), style: sty(`flex:2; height:36px; border-radius:10px; background:#82D9A5; border:0; color:#00391F; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer;`) },
              `Set ${S(v.padValue)}`
            )
          )
        ) : null),
      (v.isOrder ? h("div", { style: sty(`display:flex; flex-direction:column; gap:5px;`) },
          A(v.dragItems).map(($i, $i$i) => R($i$i, h("div", { draggable: `true`, onDragStart: fn($i.onDragStart), onDragOver: fn($i.onDragOver), onDrop: fn($i.onDrop), onDragEnd: fn($i.onDragEnd), style: sty(`display:flex; align-items:center; gap:8px; background:${S($i.bg)}; border-radius:10px; padding:7px 8px 7px 12px; cursor:grab; transition:background .12s;`) },
              h("span", { style: sty(`font-size:17px; color:#778078;`), className: "msym" },
                "drag_indicator"
              ),
              h("span", { style: sty(`flex:1; font-family:'Roboto Mono',monospace; font-size:12.5px; color:#DFE4DC;`) },
                S($i.label)
              ),
              h("button", { onClick: fn($i.up), style: sty(`width:26px; height:26px; border-radius:50%; background:transparent; border:0; color:#9AA39B; cursor:pointer;`), className: "c-h5" },
                h("span", { style: sty(`font-size:16px;`), className: "msym" },
                  "arrow_upward"
                )
              ),
              h("button", { onClick: fn($i.down), style: sty(`width:26px; height:26px; border-radius:50%; background:transparent; border:0; color:#9AA39B; cursor:pointer;`), className: "c-h5" },
                h("span", { style: sty(`font-size:16px;`), className: "msym" },
                  "arrow_downward"
                )
              ),
              h("button", { onClick: fn($i.drop), style: sty(`width:26px; height:26px; border-radius:50%; background:transparent; border:0; color:#9AA39B; cursor:pointer;`), className: "c-h6" },
                h("span", { style: sty(`font-size:16px;`), className: "msym" },
                  "close"
                )
              )
            ))),
          h("div", { style: sty(`display:flex; flex-wrap:wrap; gap:6px; margin-top:2px;`) },
            A(v.ctl.pool).map(($p, $p$i) => R($p$i, h("button", { onClick: fn($p.add), style: sty(`display:flex; align-items:center; gap:4px; background:transparent; border:1px dashed #414942; border-radius:8px; padding:5px 11px; color:#9AA39B; font-family:'Roboto Mono',monospace; font-size:11.5px; cursor:pointer;`), className: "c-h7" },
                h("span", { style: sty(`font-size:14px;`), className: "msym" },
                  "add"
                ),
                S($p.label)
              )))
          )
        ) : null),
      (v.isEditableText ? h("div", { style: sty(`display:flex; align-items:center; gap:10px; background:#141A15; border:1px solid #414942; border-radius:10px; padding:8px 12px;`) },
          h("span", { style: sty(`font-size:17px; color:#82D9A5; flex:0 0 auto;`), className: "msym" },
            "edit"
          ),
          h("input", { type: `text`, value: v.ctl.value, "aria-label": v.ctl.label, onChange: fn(v.onEditableTextInput), onInput: fn(v.onEditableTextInput), style: sty(`flex:1; min-width:0; background:transparent; border:0; outline:none; color:#DFE4DC; font-family:'Roboto Mono',monospace; font-size:13.5px; padding:2px;`) })
        ) : null),
      (v.isText ? h("div", { style: sty(`display:flex; align-items:center; gap:10px; background:#141A15; border:1px solid #414942; border-radius:10px; padding:10px 14px;`) },
          h("span", { style: sty(`font-size:17px; color:#82D9A5;`), className: "msym" },
            "keyboard"
          ),
          h("span", { style: sty(`flex:1; font-family:'Roboto Mono',monospace; font-size:13.5px; color:#DFE4DC;`) },
            S(v.ctl.display)
          ),
          h("span", { style: sty(`font-size:11px; color:#778078;`) },
            "only free-text field"
          )
        ) : null),
      (v.isFile ? h("div", { style: sty(`display:flex; flex-direction:column; gap:8px;`) },
          h("label", { style: sty(`position:relative; display:flex; align-items:center; gap:10px; background:#141A15; border:1px dashed #414942; border-radius:10px; padding:10px 14px; cursor:pointer; min-height:44px;`), className: "c-h8" },
            h("span", { style: sty(`font-size:18px; color:#82D9A5;`), className: "msym" },
              "upload_file"
            ),
            h("span", { style: sty(`flex:1; font-family:'Roboto Mono',monospace; font-size:12.5px; color:#DFE4DC; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`) },
              S(v.ctl.fileName)
            ),
            h("span", { style: sty(`font-size:11px; color:#82D9A5; font-weight:500;`) },
              "Choose file"
            ),
            h("input", { type: `file`, accept: v.ctl.accept, "aria-label": v.ctl.label, onChange: fn(v.ctl.onPick), style: sty(`position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0;`) })
          ),
          (v.ctl.hasFile ? h("button", { onClick: fn(v.ctl.onClear), style: sty(`align-self:flex-start; display:flex; align-items:center; gap:6px; background:transparent; border:1px solid #414942; border-radius:8px; padding:6px 12px; color:#C4CBC2; font:inherit; font-size:12px; cursor:pointer;`), className: "c-h9" },
              h("span", { style: sty(`font-size:15px;`), className: "msym" },
                "close"
              ),
              "Clear loaded file"
            ) : null)
        ) : null)
    )
  );
}
class M3Control extends DCLogic {
  state = { dragFrom:-1, over:-1, padOpen:false, padBuf:'' };
  renderVals() {
    const c = this.props.ctl || {};
    const st = this.state;
    const items = (c.items || []).map((it, i) => Object.assign({}, it, {
      dragging: st.dragFrom === i,
      dropTarget: st.over === i && st.dragFrom !== i && st.dragFrom >= 0,
      bg: st.dragFrom === i ? '#005230' : (st.over === i && st.dragFrom >= 0 && st.dragFrom !== i ? '#22321F' : '#141A15'),
      onDragStart: () => this.setState({ dragFrom:i }),
      onDragOver: (e) => { e.preventDefault(); if (st.over !== i) this.setState({ over:i }); },
      onDrop: (e) => { e.preventDefault(); if (st.dragFrom >= 0 && st.dragFrom !== i && c.move) c.move(st.dragFrom, i); this.setState({ dragFrom:-1, over:-1 }); },
      onDragEnd: () => this.setState({ dragFrom:-1, over:-1 })
    }));
    const clamp = (n) => {
      let x = parseFloat(n);
      if (isNaN(x)) return c.value;
      if (c.min !== undefined) x = Math.max(c.min, x);
      if (c.max !== undefined) x = Math.min(c.max, x);
      return x;
    };
    return {
      numText: String(c.value),
      onNumInput: (e) => { const raw = (e.target.value || '').replace(/[^0-9.\-]/g, ''); if (c.set) c.set(clamp(raw)); },
      padOpen: st.padOpen,
      padValue: st.padBuf || String(c.value),
      togglePad: () => this.setState(s2 => ({ padOpen:!s2.padOpen, padBuf:'' })),
      padKeys: ['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(k => ({ label:k, press:() => this.setState(s2 => ({
        padBuf: k === '⌫' ? s2.padBuf.slice(0, -1) : (s2.padBuf + k).slice(0, 9)
      })) })),
      padClear: () => this.setState({ padBuf:'' }),
      padApply: () => { const b = this.state.padBuf; if (b && c.set) c.set(clamp(b)); this.setState({ padOpen:false, padBuf:'' }); },
      dragItems: items,
      isSwitch: c.kind === 'switch',
      isSegmented: c.kind === 'segmented' && !c.narrow,
      isSegNarrow: c.kind === 'segmented' && !!c.narrow,
      isSelect: c.kind === 'select',
      isChips: c.kind === 'chips',
      isStepper: c.kind === 'stepper',
      isSlider: c.kind === 'slider',
      isOrder: c.kind === 'order',
      isEditableText: c.kind === 'text' && String(c.id || '').startsWith('pbxadm:'),
      onEditableTextInput: (e) => { if (c.set) c.set(e.target.value); },
      isText: c.kind === 'text' && !String(c.id || '').startsWith('pbxadm:'),
      isFile: c.kind === 'file',
      stepVal: c.step || 1,
      rangeLabel: (c.min !== undefined ? c.min + '–' + c.max : '')
    };
  }
}
M3Control.prototype.template = Template;
export default M3Control;


