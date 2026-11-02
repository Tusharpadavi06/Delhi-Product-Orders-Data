import React, { useState } from 'react';
import {
  CheckCircle2,
  FileCode2,
  Play,
  Zap,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

export const SetupGuide: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const steps = [
    {
      number: "01",
      title: "Open Google Apps Script in Your Sheet",
      description: "Google Spreadsheet kholo jisme 'Product Order' aur 'Product Automation' sheets hain.",
      details: [
        "Top navigation menu me jao: Extensions > Apps Script par click karo.",
        "Apps Script editor open ho jayega."
      ]
    },
    {
      number: "02",
      title: "Clean Old Files (Important for SyntaxError)",
      description: "Purana code aur duplicate files ko clean karo taaki koi error na aaye.",
      details: [
        "Agar editor me 2 files hain (e.g. 'Code.gs' aur 'Automation.gs'), to dono me same variable hone se 'SyntaxError: Identifier CONFIG already declared' error aata hai.",
        "Purana sara code select all (Ctrl+A) karke delete karo.",
        "Sirf ek clean file rakhein."
      ]
    },
    {
      number: "03",
      title: "Paste Revised Script & Save",
      description: "Naya revised code paste karo jisme Product Automation strictly configured hai.",
      details: [
        "Upar diye gaye 'Copy Apps Script' button se code copy karo aur editor me paste karo.",
        "Save icon (Ctrl+S) par click karo.",
        "Ensure karein ki tab ka naam exact 'Product Automation' aur 'Product Order' hai."
      ]
    },
    {
      number: "04",
      title: "Run Function & Review Permissions",
      description: "Function run karo aur pehli baar Google permissions allow karo.",
      details: [
        "Function dropdown me 'updateFMSFromResponses' select karo aur 'Run' dabao.",
        "Pehli baar 'Authorization required' popup aayega -> 'Review permissions' > Choose account > 'Advanced' > 'Go to Untitled project (unsafe)' > 'Allow' karein.",
        "Run hote hi 'Product Automation' sheet par redirect ho jayega aur saare records with bold borders populate ho jayenge!"
      ]
    }
  ];

  const faqs = [
    {
      q: "Product Automation sheet me changes aur border bold me as per records kyu nahi hue the?",
      a: "Iske piche 3 mukhya reasons the: \n1) Script Crash: Purane code me 'SyntaxError: Identifier CONFIG has already been declared' ya 'TypeError: (item.width || \"\").trim is not a function' error aaya tha. Jab JavaScript me beech me koi error aata hai, to execution usi line par abort ho jata hai. Is wajah se niche likha hua Border formatting aur Row merging ka code execute hi nahi ho paya tha!\n2) Sheet Name: Purane code me sheet ka naam 'Automation' dhundha ja raha tha, jabki aapki sheet ka naam 'Product Automation' hai.\n3) Solution: Naye revised code me saare errors fix kar diye gaye hain aur har order ke bottom me Google Sheets ka SOLID_MEDIUM black border (#000000) lagaya gaya hai jo har order ko alag se bold line me frame karta hai."
    },
    {
      q: "Columns F-N aur Y-Z me pehle \\n (newline) kyu aa raha tha aur ab alag rows kaise aayenge?",
      a: "Purane code me 'e.items.join(\"\\n\")' aur 'e.qtys.join(\"\\n\")' likha tha, jiski wajah se saare items ek hi merged cell ke andar enter dabakar text ki tarah jama ho rahe the. Naye code me humne har ek item ke liye alag row (outputRows.push()) banayi hai. A-E aur O-X vertically merge hote hain, lekin F-N aur Y-Z kabhi merge nahi hote — har item apni alag row me aata hai!"
    },
    {
      q: "Column Y me Dispatch quantity dalne par purana data delete kyu nahi hota?",
      a: "Jab bhi script dobara run hoti hai, to sheet clear karne se pehle script Column Y ka saara Dispatch quantity (PO + Item + Color + Width ko key banakar) memory me save kar leti hai (Step 1). Fir jab naya data likha jata hai, to wo saved Dispatch quantity wapas Column Y me restore kar deta hai! Isse aapka manually dala gaya dispatch data kabhi gayab nahi hota."
    },
    {
      q: "Column Z me Formula kaise kaam karta hai (K - Y = Z)?",
      a: "Column Z me Google Sheets ka dynamic formula lagta hai: '=IF(ISNUMBER(K2), MAX(0, K2 - N(Y2)), \"\")'. Yaha K2 total Qty hai aur Y2 Dispatch Qty hai. N(Y2) ka fayda ye hai ki agar Y2 abhi khali hai (dispatch nahi hua), to wo use 0 manta hai aur Balance pura K2 dikhata hai. Jaise hi aap Y me dispatch quantity likhte ho, Google Sheets turant bina script run kiye Z ko update kar deta hai!"
    },
    {
      q: "Product Order sheet ke Column AA me Order No enter karne par onEdit kaise chalta hai?",
      a: "Column AA sheet me column number 27 hota hai. Jab aap Column AA me Order No likhte ho, to 'onEdit(e)' trigger automatically run hota hai, matching PO aur Customer dhoondhta hai 'Product Automation' sheet me, aur Column X (24) me Order No set kar deta hai."
    },
    {
      q: "Diagnostic test function 'testProductAutomation()' kya karta hai?",
      a: "Humne script me ek test function joda hai. Aap Apps Script editor me 'testProductAutomation' select karke 'Run' daba sakte hain. Ye turant popup karke bata dega ki 'Product Order' aur 'Product Automation' tabs successfully detect ho rahe hain ya nahi, aur kitne rows available hain."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded">
              Installation &amp; Troubleshooting Guide
            </span>
            <span className="text-xs text-slate-500 font-mono">Product Order → Product Automation</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            How to Setup &amp; Fix Google Sheets Automation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Follow these simple steps to ensure the script runs completely without crashes and applies bold borders and expanded rows.
          </p>
        </div>
      </div>

      {/* Root Cause Banner */}
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-rose-950 text-sm">Important Note: Why previous execution failed in your sheet</h4>
            <p className="text-rose-900/90 mt-1 leading-relaxed">
              Google Apps Script me jab <code className="font-mono bg-rose-100/70 text-rose-950 px-1 py-0.5 rounded font-bold">TypeError</code> ya <code className="font-mono bg-rose-100/70 text-rose-950 px-1 py-0.5 rounded font-bold">SyntaxError</code> aata hai, to script turant band ho jati hai. Is wajah se aapki <strong>"Product Automation"</strong> sheet me rows aur bold borders nahi dikhe the. Naye code me sabhi errors solve kar diye gaye hain.
            </p>
          </div>
        </div>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map(step => (
          <div key={step.number} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold font-mono text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                  Step {step.number}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-3">
                {step.title}
              </h3>
              <p className="text-xs font-medium text-slate-600 mt-1">
                {step.description}
              </p>

              <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                {step.details.map((detail, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Technical Explanations (Hindi & English) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-700" />
          Frequently Asked Questions &amp; Technical Clarifications
        </h2>
        <p className="text-xs text-slate-500 mt-0.5 mb-4">
          Aapke sawalo ke exact answers aur script internal working ki details:
        </p>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="border border-slate-200 rounded-lg overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left text-xs font-semibold text-slate-900 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-emerald-700">Q{idx + 1}.</span>
                    <span>{faq.q}</span>
                  </span>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 py-3 bg-white text-xs text-slate-700 leading-relaxed border-t border-slate-100 whitespace-pre-line">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Safety Checklist */}
      <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-emerald-950">Pre-Flight Safety Check for Your Spreadsheet</h4>
            <p className="text-emerald-900/80 mt-0.5">
              Sheet tabs ka naam exactly <code className="font-mono font-semibold bg-emerald-100/70 px-1 py-0.5 rounded">Product Order</code> aur <code className="font-mono font-semibold bg-emerald-100/70 px-1 py-0.5 rounded">Product Automation</code> hona chahiye. Naye code me whitespace trim aur case tolerance add kar di gayi hai.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
