import { SeatAvatar } from "./DuoSeats.jsx";
import { DUO_SCENES, sceneOf } from "../../data/duo.js";

/**
 * Las seis escenas de la noche. Cada una alcanzada se puede volver a abrir; dentro de «Gustos»,
 * cada persona es su butaca de color. «Decidir» abre la ronda guardada y «Plan» la elección.
 */
export default function DuoProgress({ step, steps, reached, names, roundOpen, hasRound, hasFinal, onGo, onDecide }) {
  const current = sceneOf(step, roundOpen);
  const reachedStep = (key) => steps.findIndex((item) => item.key === key) <= reached;
  const target = { setup: "mode", taste: "person-0", match: "common", compare: "results", plan: "final" };
  const available = (key) => (key === "decide" ? hasRound : key === "plan" ? hasFinal : reachedStep(target[key]));
  const index = DUO_SCENES.findIndex((scene) => scene.key === current);
  const personIndex = step.startsWith("person-") ? Number(step.slice(7)) : null;

  return (
    <nav className="duo-scenes" aria-label="Escenas de la noche">
      <div className="duo-progress-track" role="progressbar" aria-label="Avance de la noche" aria-valuemin={1} aria-valuemax={DUO_SCENES.length} aria-valuenow={index + 1} aria-valuetext={`Escena ${index + 1} de ${DUO_SCENES.length}: ${DUO_SCENES[index].label}`}>
        <span style={{ "--progress": (index + 1) / DUO_SCENES.length }} />
      </div>
      <ol>
        {DUO_SCENES.map((scene, position) => {
          const state = position < index ? "done" : position === index ? "current" : "next";
          return (
            <li key={scene.key} data-state={state}>
              <button
                type="button"
                aria-current={state === "current" ? "step" : undefined}
                aria-label={`${position + 1}. ${scene.label}`}
                disabled={state !== "current" && !available(scene.key)}
                onClick={() => (scene.key === "decide" ? onDecide() : onGo(target[scene.key]))}
              >
                <span className="duo-scene-dot" aria-hidden="true">
                  {state === "done" ? "✓" : position + 1}
                </span>
                <span className="duo-scene-label" aria-hidden="true">
                  {scene.short}
                </span>
              </button>
              {scene.key === "taste" && state === "current" && names.length > 1 && (
                <span className="duo-scene-seats" role="group" aria-label="Butacas">
                  {names.map((name, person) => (
                    <button
                      key={person}
                      type="button"
                      className={personIndex === person ? "is-current" : undefined}
                      aria-current={personIndex === person ? "step" : undefined}
                      aria-label={`Gustos de ${name}`}
                      disabled={!reachedStep(`person-${person}`)}
                      onClick={() => onGo(`person-${person}`)}
                    >
                      <SeatAvatar index={person} name={name} />
                    </button>
                  ))}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
