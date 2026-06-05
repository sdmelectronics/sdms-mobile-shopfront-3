import { Truck, ShieldCheck, Phone } from "lucide-react";

const items = [
  { icon: Truck, title: "Free Kampala delivery", sub: "On every order, no minimum." },
  { icon: ShieldCheck, title: "Genuine & warrantied", sub: "Authentic products only." },
  { icon: Phone, title: "Talk to a human", sub: "Call or WhatsApp anytime." },
];

export const ValueBand = () => {
  return (
    <section className="max-w-[1240px] mx-auto px-4 md:px-8 pt-10 md:pt-14">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {items.map(({ icon: Icon, title, sub }) => (
          <div
            key={title}
            className="flex items-center gap-3.5 p-5 md:p-[22px] bg-warm-surface border border-warm-line rounded-2xl"
          >
            <span className="w-[46px] h-[46px] rounded-xl bg-warm-accentSoft text-warm-accent flex items-center justify-center flex-shrink-0">
              <Icon className="w-[22px] h-[22px]" />
            </span>
            <div>
              <b className="block text-sm font-semibold text-warm-ink">{title}</b>
              <span className="text-[12.5px] text-warm-muted">{sub}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ValueBand;
