import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "bill_last_calculation";

const BUTTONS = [
  { label: "AC", action: "ac", type: "fn clear" },
  { label: "+/−", action: "sign", type: "fn" },
  { label: "%", action: "pct", type: "fn" },
  { label: "÷", action: "op", val: "÷", type: "op" },
  { label: "7", action: "num", val: "7", type: "num" },
  { label: "8", action: "num", val: "8", type: "num" },
  { label: "9", action: "num", val: "9", type: "num" },
  { label: "×", action: "op", val: "×", type: "op" },
  { label: "4", action: "num", val: "4", type: "num" },
  { label: "5", action: "num", val: "5", type: "num" },
  { label: "6", action: "num", val: "6", type: "num" },
  { label: "−", action: "op", val: "−", type: "op" },
  { label: "1", action: "num", val: "1", type: "num" },
  { label: "2", action: "num", val: "2", type: "num" },
  { label: "3", action: "num", val: "3", type: "num" },
  { label: "+", action: "op", val: "+", type: "op" },
  { label: "0", action: "num", val: "0", type: "num zero" },
  { label: ".", action: "dot", type: "num" },
  { label: "=", action: "eq", type: "eq" },
];

function fmt(n) {
  const num = parseFloat(n);
  if (isNaN(num)) return "Error";
  if (Math.abs(num) > 1e12 || (Math.abs(num) < 1e-7 && num !== 0)) {
    return num.toExponential(4);
  }
  const s = parseFloat(num.toPrecision(10)).toString();
  return s.length > 12 ? parseFloat(num.toFixed(6)).toString() : s;
}

function compute(a, op, b) {
  switch (op) {
    case "+": return a + b;
    case "−": return a - b;
    case "×": return a * b;
    case "÷": return b === 0 ? null : a / b;
    default:  return null;
  }
}

export default function SimpleCalculator() {
  const [cur, setCur] = useState("0");
  const [prev, setPrev] = useState(null);
  const [op, setOp] = useState(null);
  const [justEvaled, setJE] = useState(false);
  const [dotUsed, setDotUsed] = useState(false);
  const [history, setHistory] = useState("");
  const [expr, setExpr] = useState("");
  const [lastSaved, setLastSaved] = useState("—");
  const [popAnim, setPopAnim] = useState(false);
  const [shakeAnim, setShakeAnim] = useState(false);
  const [activeBtn, setActiveBtn] = useState(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v) setLastSaved(v);
    } catch {}
  }, []);

  const triggerPop = () => {
    setPopAnim(false);
    setTimeout(() => setPopAnim(true), 10);
  };

  const triggerShake = () => {
    setShakeAnim(false);
    setTimeout(() => setShakeAnim(true), 10);
  };

  const saveCalc = useCallback((txt) => {
    try {
      localStorage.setItem(STORAGE_KEY, txt);
    } catch {}
    setLastSaved(txt);
  }, []);

  const doNum = useCallback((v, curState, jeState) => {
    let next;
    if (jeState) {
      next = v;
      setJE(false);
      setDotUsed(v === ".");
    } else if (curState === "0" && v !== ".") {
      next = v;
    } else {
      if (curState.replace("-", "").replace(".", "").length >= 12) return curState;
      next = curState + v;
    }
    if (v === ".") setDotUsed(true);
    triggerPop();
    return next;
  }, []);

  const handleNum = useCallback(
    (v) => {
      setCur((c) => doNum(v, c, justEvaled));
      setExpr(op && prev !== null ? fmt(prev) + " " + op : "");
    },
    [justEvaled, op, prev, doNum]
  );

  const handleDot = useCallback(() => {
    if (dotUsed) return;
    setCur((c) => {
      if (justEvaled) {
        setJE(false);
        setDotUsed(true);
        return "0.";
      }
      setDotUsed(true);
      return c + ".";
    });
    triggerPop();
  }, [dotUsed, justEvaled]);

  const handleOp = useCallback(
    (o) => {
      setCur((c) => {
        const curNum = parseFloat(c);
        if (op && prev !== null && !justEvaled) {
          const res = compute(prev, op, curNum);
          if (res !== null) {
            setPrev(res);
            setExpr(fmt(res) + " " + o);
            setJE(false);
            setDotUsed(false);
            setOp(o);
            triggerPop();
            return fmt(res);
          }
        }
        setPrev(curNum);
        setOp(o);
        setJE(false);
        setDotUsed(false);
        setExpr(fmt(curNum) + " " + o);
        triggerPop();
        return "0";
      });
    },
    [op, prev, justEvaled]
  );

  const handleEq = useCallback(() => {
    setCur((c) => {
      if (!op || prev === null) return c;
      const b = parseFloat(c);
      const res = compute(prev, op, b);
      const histTxt =
        fmt(prev) + " " + op + " " + fmt(b) + " = " + (res !== null ? fmt(res) : "Error");

      setHistory(histTxt);
      setExpr("");

      if (res === null) {
        triggerShake();
        setOp(null);
        setPrev(null);
        setJE(true);
        setDotUsed(false);
        return "Error";
      }

      saveCalc(histTxt);
      setOp(null);
      setPrev(null);
      setJE(true);
      setDotUsed(fmt(res).includes("."));
      triggerPop();
      return fmt(res);
    });
  }, [op, prev, saveCalc]);

  const handleAC = useCallback(() => {
    setCur("0");
    setPrev(null);
    setOp(null);
    setJE(false);
    setDotUsed(false);
    setHistory("");
    setExpr("");
  }, []);

  const handleSign = useCallback(() => {
    setCur((c) => {
      if (c === "0" || c === "Error") return c;
      const next = c.startsWith("-") ? c.slice(1) : "-" + c;
      triggerPop();
      return next;
    });
  }, []);

  const handlePct = useCallback(() => {
    setCur((c) => {
      const n = parseFloat(c);
      if (isNaN(n)) return c;
      const next = fmt(n / 100);
      setDotUsed(next.includes("."));
      triggerPop();
      return next;
    });
  }, []);

  const dispatch = useCallback(
    (action, val) => {
      if (action === "num") handleNum(val);
      else if (action === "op") handleOp(val);
      else if (action === "eq") handleEq();
      else if (action === "ac") handleAC();
      else if (action === "sign") handleSign();
      else if (action === "pct") handlePct();
      else if (action === "dot") handleDot();
    },
    [handleNum, handleOp, handleEq, handleAC, handleSign, handlePct, handleDot]
  );

  useEffect(() => {
    const handler = (e) => {
      if (e.key >= "0" && e.key <= "9") dispatch("num", e.key);
      else if (e.key === ".") dispatch("dot");
      else if (e.key === "+") dispatch("op", "+");
      else if (e.key === "-") dispatch("op", "−");
      else if (e.key === "*") dispatch("op", "×");
      else if (e.key === "/") {
        e.preventDefault();
        dispatch("op", "÷");
      } else if (e.key === "Enter" || e.key === "=") dispatch("eq");
      else if (e.key === "Escape") dispatch("ac");
      else if (e.key === "Backspace") {
        setCur((c) => {
          if (c === "Error" || c.length <= 1) return "0";
          const next = c.slice(0, -1) || "0";
          if (!next.includes(".")) setDotUsed(false);
          return next;
        });
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch]);

  const displayCur = cur.length > 12 ? parseFloat(cur).toExponential(4) : cur;
  const displaySize =
    displayCur.length > 9 ? "text-2xl" : displayCur.length > 6 ? "text-3xl" : "text-4xl";

  return (
    <div className="bg-white rounded-xl shadow p-4 h-full">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Calculator</h2>
          <p className="text-sm text-slate-500">Quick calculations inside dashboard</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
        <div className="px-4 pt-4 pb-3 min-h-[120px] flex flex-col justify-end items-end gap-1 border-b border-slate-200 bg-white">
          <div className="text-xs text-slate-400 h-4 text-right w-full truncate">
            {history || "\u00A0"}
          </div>
          <div className="text-sm text-slate-400 h-5 text-right w-full">
            {expr || "\u00A0"}
          </div>
          <div
            className={`font-semibold text-slate-900 text-right w-full leading-tight transition-all ${displaySize} ${
              popAnim ? "animate-[pop_0.15s_ease]" : ""
            } ${shakeAnim ? "animate-[shake_0.25s_ease]" : ""}`}
            onAnimationEnd={() => {
              setPopAnim(false);
              setShakeAnim(false);
            }}
          >
            {displayCur}
          </div>
        </div>

        <div className="grid grid-cols-4">
          {BUTTONS.map((btn, i) => {
            const isZero = btn.type.includes("zero");
            const isOp = btn.type.includes("op");
            const isEq = btn.type.includes("eq");
            const isFn = btn.type.includes("fn");
            const isClear = btn.type.includes("clear");
            const isActive = activeBtn === i;

            return (
              <button
                key={i}
                type="button"
                aria-label={btn.label}
                onPointerDown={() => setActiveBtn(i)}
                onPointerUp={() => {
                  setActiveBtn(null);
                  dispatch(btn.action, btn.val);
                }}
                onPointerLeave={() => setActiveBtn(null)}
                className={[
                  "relative overflow-hidden flex items-center justify-center h-[64px] text-base font-medium select-none transition-all duration-75",
                  isZero ? "col-span-2" : "",
                  i % 4 !== 0 ? "border-l border-slate-200" : "",
                  i >= 4 ? "border-t border-slate-200" : "",
                  isEq ? "bg-blue-600 text-white hover:bg-blue-700" : "",
                  isOp ? "bg-blue-50 text-blue-700 hover:bg-blue-100" : "",
                  isClear ? "bg-red-50 text-red-600 hover:bg-red-100" : "",
                  isFn && !isClear ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "",
                  !isEq && !isOp && !isFn ? "bg-white text-slate-800 hover:bg-slate-50" : "",
                  isActive ? "scale-95" : "scale-100",
                ].join(" ")}
              >
                {btn.label}
                {isActive && (
                  <span className="absolute inset-0 bg-current opacity-10 pointer-events-none" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
        <span className="text-xs text-slate-400">Last saved</span>
        <span className="text-xs text-slate-600 font-mono truncate max-w-[180px]">
          {lastSaved}
        </span>
      </div>

      <style>{`
        @keyframes pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          60% { transform: translateX(5px); }
          80% { transform: translateX(-2px); }
        }
      `}</style>
    </div>
  );
}