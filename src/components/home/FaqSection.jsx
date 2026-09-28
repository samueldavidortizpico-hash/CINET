import { FAQ } from "../../data/faq.js";
import { useReveal } from "../../hooks/useReveal.js";

function FaqItem({ question, answer }) {
  const [ref, revealClass] = useReveal();

  return (
    <article ref={ref} className={`faq-item ${revealClass}`}>
      <details>
        <summary>{question}</summary>
        <p>{answer}</p>
      </details>
    </article>
  );
}

export default function FaqSection() {
  const [ref, revealClass] = useReveal();

  return (
    <section ref={ref} id="faq" className={`faq faq-section ${revealClass}`}>
      <div className="section-inner">
        <p className="eyebrow">AYUDA</p>
        <h2>Preguntas frecuentes</h2>
        {FAQ.map((item) => (
          <FaqItem key={item.question} {...item} />
        ))}
      </div>
    </section>
  );
}
