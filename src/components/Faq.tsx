import { useTranslations } from "next-intl";

export interface FaqItem {
  question: string;
  answer: string;
}

export function Faq() {
  const t = useTranslations("faq");
  const items = t.raw("items") as FaqItem[];

  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
            <h2>{t("title")}</h2>
          </div>
        </div>

        <div className="faq">
          {items.map((item) => (
            <details key={item.question}>
              <summary>
                {item.question}
                <span className="plus" aria-hidden="true" />
              </summary>
              <div className="answer">{item.answer}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
