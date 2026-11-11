/* =========================================================
   Centro «Legal y privacidad». BORRADORES escritos a partir de lo que
   el código hace hoy (ver docs/LEGAL-PENDIENTES.md). No son textos
   aprobados jurídicamente: faltan el responsable, el contacto y varias
   decisiones que se marcan como «Pendiente». No se registra aceptación.
   Bloques: texto → párrafo · array → lista.
   ========================================================= */

export const LEGAL_UPDATED = "2026-10-11";
export const LEGAL_STATUS = "Borrador en revisión: todavía no tiene aprobación jurídica.";

const PENDING_CONTACT = "Pendiente: CINET aún no ha publicado un canal de contacto para estas solicitudes. Se indicará aquí cuando exista.";

export const LEGAL_DOCS = [
  {
    slug: "terminos",
    title: "Términos del servicio",
    summary: "Qué ofrece CINET, cómo usar tu cuenta y qué no hace el servicio.",
    sections: [
      {
        id: "que-es",
        title: "Qué es CINET",
        blocks: [
          "CINET es una aplicación web para descubrir películas y series, recibir recomendaciones, decidir en grupo qué ver (Duo y sus salas de votación) y organizar planes de cine o en casa con otras personas.",
          "CINET nace como proyecto académico en la Universidad de La Sabana. Pendiente: identificar a la persona o entidad responsable del servicio.",
        ],
      },
      {
        id: "cuentas",
        title: "Cuentas e invitados",
        blocks: [
          [
            "Puedes explorar el catálogo y usar Duo en este navegador sin crear una cuenta.",
            "Para compartir planes, unirte a grupos o votar en salas con tu identidad necesitas una cuenta con correo y contraseña. Según la configuración del servicio, puede ser necesario confirmar el correo antes de iniciar sesión.",
            "Si el servicio lo habilita, puedes unirte a una sala o a un plan como invitado sin correo. Ese acceso vive solo en el navegador donde entraste: si cierras sesión o borras los datos del navegador, se pierde.",
            "Eres responsable de mantener tu contraseña en secreto y de la actividad hecha con tu cuenta. Usa un nombre que no suplante a otra persona.",
          ],
        ],
      },
      {
        id: "uso-aceptable",
        title: "Uso aceptable",
        blocks: [
          "No uses CINET para:",
          [
            "publicar en tu nombre, usuario, foto, biografía, planes o grupos contenido ilegal, ofensivo o que vulnere derechos de otras personas;",
            "intentar acceder a cuentas, planes, grupos o votos que no son tuyos;",
            "automatizar solicitudes de forma abusiva o eludir los límites del servicio;",
            "presentar a CINET como vendedor oficial de entradas o como titular de derechos sobre las obras.",
          ],
        ],
      },
      {
        id: "recomendaciones",
        title: "Recomendaciones y disponibilidad",
        blocks: [
          "Las recomendaciones se calculan con datos de The Movie Database (TMDB) y con los gustos que indicas. Son sugerencias, no garantías de que una obra te guste ni de que esté disponible.",
          "La disponibilidad en plataformas proviene de JustWatch a través de TMDB y puede cambiar sin aviso. Las fechas y horas de un plan las propone quien lo organiza; CINET no inventa funciones de cine. Las funciones publicadas por cines aliados muestran su fuente y su última actualización.",
        ],
      },
      {
        id: "lo-que-no-hace",
        title: "Lo que CINET no hace",
        blocks: [
          [
            "No reproduce películas ni series completas. Los tráilers se muestran desde YouTube.",
            "No concede derechos de exhibición: organizar un plan no autoriza proyecciones públicas.",
            "No vende entradas ni confirma reservas. Recomendar un título, elegir un horario o crear un plan no reserva asientos: la compra se hace en el sitio oficial de cada cine o plataforma.",
          ],
        ],
      },
      {
        id: "servicios-externos",
        title: "Servicios externos",
        blocks: [
          "CINET enlaza a sitios de cadenas de cine, plataformas de streaming, TMDB y YouTube. Esos servicios tienen sus propias condiciones y políticas, y CINET no los controla. Una compra o suscripción hecha allí es una relación entre tú y ese proveedor.",
        ],
      },
      {
        id: "precio",
        title: "Funciones gratuitas y de pago",
        blocks: [
          "Hoy todas las funciones de CINET son gratuitas y CINET no procesa cobros. CINET Plus existe solo como prueba sin cobro (modo sandbox) que el equipo puede activar o desactivar; no hay pasarela de pago conectada.",
          "Antes de cobrar por cualquier función se publicarán sus condiciones, el precio y la política de cancelaciones y reembolsos completa.",
        ],
      },
      {
        id: "soporte",
        title: "Soporte, suspensión y cierre de cuenta",
        blocks: [
          [
            "Soporte: pendiente. Todavía no hay un canal de soporte publicado.",
            "Suspensión: pendiente. No existe aún un procedimiento definido para suspender cuentas que incumplan estos términos.",
            "Cierre de cuenta: pendiente. La app todavía no ofrece un botón para borrar tu cuenta. Mientras tanto puedes cerrar sesión, borrar tus gustos guardados desde tu perfil y salir de grupos y de los planes que no organizas.",
          ],
        ],
      },
      {
        id: "cambios",
        title: "Cambios en estos términos",
        blocks: ["Cuando estos términos cambien se actualizará la fecha de esta página. Pendiente: definir cómo se avisará de cambios importantes a quienes tienen cuenta."],
      },
    ],
  },
  {
    slug: "privacidad",
    title: "Política de privacidad",
    summary: "Qué datos usa CINET, dónde se guardan, quién los ve y qué puedes hacer con ellos.",
    sections: [
      {
        id: "responsable",
        title: "Responsable",
        blocks: ["Pendiente: nombre de la persona o entidad responsable del tratamiento, su identificación y su dirección. " + PENDING_CONTACT],
      },
      {
        id: "cuenta",
        title: "Datos de tu cuenta y tu perfil",
        blocks: [
          [
            "Correo electrónico y contraseña: los gestiona Supabase Auth. CINET nunca guarda ni ve tu contraseña en texto legible.",
            "Nombre visible y, si los añades, nombre de usuario, biografía y foto de perfil.",
            "Tu rol en CINET (usuario, moderador o administración), que solo se asigna desde la base de datos.",
            "Tu foto de perfil se guarda en un almacenamiento público: cualquiera que tenga su dirección puede verla. No subas una foto que no quieras que sea pública.",
          ],
        ],
      },
      {
        id: "gustos",
        title: "Gustos, votos, grupos y planes",
        blocks: [
          [
            "Gustos de tu cuenta (región, plataformas, géneros favoritos y a evitar, duración máxima): solo tú puedes leerlos. Desde tu perfil puedes descargarlos o borrarlos.",
            "Votos en salas de Duo: cada persona ve solo sus propios votos; el resultado lo calcula el servidor. Quien abre la sala recibe los gustos de la sala sin nombres y en orden aleatorio; en una sala de dos personas se pueden deducir los de la otra, y la app lo avisa.",
            "Planes: el nombre del plan, la película, fecha, hora, lugar, presupuesto estimado y la lista de personas con su nombre visible y su respuesta los ven todas las personas del plan. Los votos de la encuesta de horarios también son visibles para el plan.",
            "Invitaciones: un enlace de invitación permite unirse a un plan o grupo mientras siga vigente; quien organiza puede revocarlo. El enlace nunca se envía a la medición anónima.",
            "Grupos: sus miembros se ven entre sí. Entrar a un grupo no da acceso a planes pasados.",
          ],
        ],
      },
      {
        id: "navegador",
        title: "Qué se guarda solo en tu navegador",
        blocks: [
          "Estos datos se quedan en el almacenamiento local de este navegador y no se sincronizan con el servidor:",
          [
            "favoritas, historial de búsqueda, sesión e historial de Duo y sus preferencias;",
            "planes creados sin cuenta y la función elegida antes de crear un plan;",
            "tema claro u oscuro, «menos movimiento» y tu decisión sobre la medición anónima.",
          ],
          "La sesión de tu cuenta (los tokens de Supabase) también se guarda en el navegador para no pedirte la contraseña en cada visita. Al cerrar sesión se elimina.",
        ],
      },
      {
        id: "finalidades",
        title: "Para qué se usan",
        blocks: [
          [
            "Crear y proteger tu cuenta e iniciar sesión.",
            "Recomendarte títulos y calcular decisiones de grupo.",
            "Compartir planes, grupos y salas con las personas que tú invitas.",
            "Medir de forma anónima el uso de funciones, solo si das tu consentimiento.",
          ],
          "CINET no vende tus datos ni los usa para publicidad personalizada. Las ofertas de aliados se marcan siempre como «Patrocinado» y no cambian el orden de las recomendaciones.",
        ],
      },
      {
        id: "proveedores",
        title: "Proveedores que intervienen",
        blocks: [
          [
            "Supabase: cuentas, base de datos, almacenamiento de fotos y actualizaciones en tiempo real de las salas.",
            "Vercel: alojamiento de la app y funciones de servidor (consulta del catálogo a TMDB y vista previa al compartir).",
            "TMDB: datos del catálogo. Las consultas pasan por el servidor de CINET, pero las imágenes de pósteres se cargan directamente desde los servidores de TMDB.",
            "YouTube: reproduce los tráilers cuando abres uno.",
            "Google Fonts: sirve las tipografías de la app.",
          ],
          "Estos proveedores pueden registrar datos técnicos como la dirección IP o el navegador según sus propias políticas. Pendiente: confirmar la región de alojamiento y las transferencias internacionales de datos.",
        ],
      },
      {
        id: "medicion",
        title: "Medición anónima y consentimiento",
        blocks: [
          "La medición solo funciona si el servicio tiene configurado un destino y tú la aceptas en el aviso. Envía una lista cerrada de eventos (por ejemplo, «se creó un plan») con un identificador aleatorio de este navegador; nunca tu correo, nombre, id de cuenta, gustos, votos ni enlaces de invitación.",
          "Puedes activarla o desactivarla en cualquier momento desde el pie de página. Al desactivarla se borra el identificador de este navegador.",
        ],
      },
      {
        id: "familia",
        title: "Modo familia y menores",
        blocks: [
          "El modo familia de Duo solo filtra títulos según su clasificación por edad en TMDB. No crea cuentas infantiles, no verifica edades y no cambia cómo se tratan los datos.",
          "Pendiente: definir la edad mínima para crear una cuenta y el tratamiento de datos de menores.",
        ],
      },
      {
        id: "derechos",
        title: "Tus opciones, conservación y borrado",
        blocks: [
          [
            "Puedes ver y editar tu perfil, descargar y borrar tus gustos, salir de grupos y de los planes que no organizas, y retirar el consentimiento de medición.",
            "Pendiente: la app todavía no permite borrar la cuenta completa ni exportar todos tus datos. Al borrar una cuenta desde Supabase se elimina también su perfil.",
            "Pendiente: plazos de conservación de cuentas inactivas, planes antiguos y registros técnicos. No hay borrado automático configurado.",
          ],
          PENDING_CONTACT,
        ],
      },
    ],
  },
  {
    slug: "cancelaciones",
    title: "Cancelaciones y reembolsos",
    summary: "CINET no cobra hoy por ninguna función. Esto es lo que aplica mientras tanto.",
    sections: [
      {
        id: "estado",
        title: "Situación actual: sin cobros",
        blocks: [
          "CINET no procesa pagos. No hay pasarela de pago conectada y ninguna función de la app genera un cobro.",
          "CINET Plus solo existe como prueba sin cobro (sandbox). Activarla o terminarla no implica pagos ni reembolsos.",
        ],
      },
      {
        id: "externas",
        title: "Compras en sitios externos",
        blocks: [
          "Las entradas de cine, suscripciones de streaming u otras compras que hagas en sitios a los que enlaza CINET se rigen por las condiciones de ese proveedor. Las cancelaciones y reembolsos se solicitan directamente allí: CINET no puede tramitarlos.",
          "Cancelar un plan en CINET no cancela entradas que ya hayas comprado por tu cuenta.",
        ],
      },
      {
        id: "antes-de-cobrar",
        title: "Antes de activar pagos",
        blocks: [
          "Esta política se completará antes de que CINET cobre por cualquier función, con: cómo cancelar, qué pasa con la renovación, hasta cuándo se mantiene el acceso y el canal para pedir un reembolso, conforme a la normativa de protección al consumidor que aplique. Hasta entonces no se publican plazos ni condiciones.",
        ],
      },
    ],
  },
  {
    slug: "creditos",
    title: "Créditos y fuentes",
    summary: "De dónde vienen los datos, imágenes y recursos que usa CINET.",
    sections: [
      {
        id: "tmdb",
        title: "The Movie Database (TMDB)",
        blocks: [
          "Los datos de películas y series, los pósteres y los tráilers asociados provienen de The Movie Database (TMDB).",
          "This product uses the TMDB API but is not endorsed or certified by TMDB.",
        ],
        link: { href: "https://www.themoviedb.org", label: "themoviedb.org" },
      },
      {
        id: "justwatch",
        title: "JustWatch",
        blocks: ["La información sobre en qué plataforma ver cada título la proporciona JustWatch a través de TMDB. Puede cambiar sin aviso."],
        link: { href: "https://www.justwatch.com", label: "justwatch.com" },
      },
      {
        id: "recursos",
        title: "Otros recursos",
        blocks: [["Tráilers reproducidos desde YouTube.", "Tipografías Inter y Outfit, servidas por Google Fonts."]],
      },
    ],
  },
];

export const findLegalDoc = (slug) => LEGAL_DOCS.find((doc) => doc.slug === slug) ?? null;
