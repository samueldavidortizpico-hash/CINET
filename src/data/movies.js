/* =========================================================
   CINEHUB — Catálogo de películas (datos originales del prototipo).
   Consultas y transformaciones: services/movieService.js
   ========================================================= */

export const movies = {

  /* =======================================================
     MARVEL
     ======================================================= */

  "avengers-doomsday": {
    title: "Avengers: Doomsday",
    year: "2026",
    genre: "Acción / Superhéroes",
    genreFilter: "accion",
    duration: "Por confirmar",
    rating: 8.8,
    popularity: 100,
    status: "PRÓXIMAMENTE",

    poster: "images/avengers-doomsday.jpg",

    accent: "#8b1e2d",
    accent2: "#5b21b6",

    description:
      "Los héroes más poderosos del universo se enfrentan a una nueva amenaza que pondrá a prueba sus alianzas y cambiará el futuro del universo.",

    tags: [
      "Marvel",
      "Avengers",
      "Acción",
      "Superhéroes",
      "Ciencia ficción"
    ],

    director: "Marvel Studios",
    universe: "Marvel Cinematic Universe",
    quality: "4K / HDR"
  },

  "avengers-endgame": {
    title: "Avengers: Endgame",
    year: "2019",
    genre: "Acción / Superhéroes",
    genreFilter: "accion",
    duration: "3h 1min",
    rating: 8.4,
    popularity: 99,
    status: "ÉPICA",

    poster: "images/avengers-endgame.jpg",

    accent: "#7c1d1d",
    accent2: "#f59e0b",

    description:
      "Los Avengers supervivientes deben encontrar una manera de revertir las consecuencias del chasquido y enfrentarse nuevamente a Thanos.",

    tags: [
      "Marvel",
      "Avengers",
      "Thanos",
      "Acción",
      "Superhéroes"
    ],

    director: "Anthony Russo y Joe Russo",
    universe: "Marvel Cinematic Universe",
    quality: "4K / HDR"
  },

  "avengers-infinity-war": {
    title: "Avengers: Infinity War",
    year: "2018",
    genre: "Acción / Superhéroes",
    genreFilter: "accion",
    duration: "2h 29min",
    rating: 8.4,
    popularity: 98,
    status: "POPULAR",

    poster: "images/avengers-infinity-war.jpg",

    accent: "#6d28d9",
    accent2: "#dc2626",

    description:
      "Los Avengers y sus aliados se enfrentan a Thanos mientras el destino del universo queda en juego.",

    tags: [
      "Marvel",
      "Avengers",
      "Thanos",
      "Infinity Stones",
      "Acción"
    ],

    director: "Anthony Russo y Joe Russo",
    universe: "Marvel Cinematic Universe",
    quality: "4K / HDR"
  },

  "iron-man": {
    title: "Iron Man",
    year: "2008",
    genre: "Acción / Superhéroes",
    genreFilter: "accion",
    duration: "2h 6min",
    rating: 7.9,
    popularity: 94,
    status: "CLÁSICO",

    poster: "images/iron-man.jpg",

    accent: "#dc2626",
    accent2: "#f59e0b",

    description:
      "Tony Stark construye una poderosa armadura y comienza una nueva vida como uno de los héroes más importantes del mundo.",

    tags: [
      "Marvel",
      "Iron Man",
      "Tony Stark",
      "Acción",
      "Tecnología"
    ],

    director: "Jon Favreau",
    universe: "Marvel Cinematic Universe",
    quality: "4K / HDR"
  },

  "captain-america-the-winter-soldier": {
    title: "Captain America: The Winter Soldier",
    year: "2014",
    genre: "Acción / Espionaje",
    genreFilter: "accion",
    duration: "2h 16min",
    rating: 7.7,
    popularity: 90,
    status: "DESTACADA",

    poster: "images/captain-america-winter-soldier.jpg",

    accent: "#1d4ed8",
    accent2: "#475569",

    description:
      "Steve Rogers descubre una conspiración dentro de S.H.I.E.L.D. mientras se enfrenta a un misterioso enemigo conocido como Winter Soldier.",

    tags: [
      "Marvel",
      "Captain America",
      "Espionaje",
      "Acción",
      "S.H.I.E.L.D."
    ],

    director: "Anthony Russo y Joe Russo",
    universe: "Marvel Cinematic Universe",
    quality: "4K / HDR"
  },

  "thor-ragnarok": {
    title: "Thor: Ragnarok",
    year: "2017",
    genre: "Acción / Fantasía",
    genreFilter: "aventura",
    duration: "2h 10min",
    rating: 7.9,
    popularity: 91,
    status: "POPULAR",

    poster: "images/thor-ragnarok.jpg",

    accent: "#7c3aed",
    accent2: "#06b6d4",

    description:
      "Thor debe escapar de Sakaar y regresar a Asgard para detener a Hela y evitar el Ragnarok.",

    tags: [
      "Marvel",
      "Thor",
      "Loki",
      "Asgard",
      "Acción"
    ],

    director: "Taika Waititi",
    universe: "Marvel Cinematic Universe",
    quality: "4K / HDR"
  },

  "guardians-of-the-galaxy": {
    title: "Guardians of the Galaxy",
    year: "2014",
    genre: "Acción / Aventura",
    genreFilter: "aventura",
    duration: "2h 1min",
    rating: 8.0,
    popularity: 89,
    status: "POPULAR",

    poster: "images/guardians-of-the-galaxy.jpg",

    accent: "#2563eb",
    accent2: "#9333ea",

    description:
      "Un grupo de inadaptados intergalácticos debe unir fuerzas para proteger una poderosa esfera de una amenaza cósmica.",

    tags: [
      "Marvel",
      "Guardianes",
      "Espacio",
      "Comedia",
      "Aventura"
    ],

    director: "James Gunn",
    universe: "Marvel Cinematic Universe",
    quality: "4K / HDR"
  },

  "spider-man-no-way-home": {
    title: "Spider-Man: No Way Home",
    year: "2021",
    genre: "Acción / Superhéroes",
    genreFilter: "accion",
    duration: "2h 28min",
    rating: 8.2,
    popularity: 97,
    status: "POPULAR",

    poster: "images/spider-man-no-way-home.jpg",

    accent: "#dc2626",
    accent2: "#1d4ed8",

    description:
      "Peter Parker se enfrenta a las consecuencias de revelar su identidad mientras el multiverso comienza a romperse.",

    tags: [
      "Marvel",
      "Spider-Man",
      "Multiverso",
      "Acción",
      "Aventura"
    ],

    director: "Jon Watts",
    universe: "Marvel Cinematic Universe",
    quality: "4K / HDR"
  },

  "spider-man-homecoming": {
    title: "Spider-Man: Homecoming",
    year: "2017",
    genre: "Acción / Superhéroes",
    genreFilter: "accion",
    duration: "2h 13min",
    rating: 7.4,
    popularity: 88,
    status: "DESTACADA",

    poster: "images/spider-man-homecoming.jpg",

    accent: "#dc2626",
    accent2: "#2563eb",

    description:
      "Peter Parker intenta equilibrar su vida como estudiante con sus responsabilidades como Spider-Man.",

    tags: [
      "Marvel",
      "Spider-Man",
      "Peter Parker",
      "Acción",
      "Aventura"
    ],

    director: "Jon Watts",
    universe: "Marvel Cinematic Universe",
    quality: "4K / HDR"
  },

  "black-panther": {
    title: "Black Panther",
    year: "2018",
    genre: "Acción / Superhéroes",
    genreFilter: "accion",
    duration: "2h 14min",
    rating: 7.3,
    popularity: 86,
    status: "POPULAR",

    poster: "images/black-panther.jpg",

    accent: "#7c3aed",
    accent2: "#111827",

    description:
      "T'Challa regresa a Wakanda para asumir el trono mientras un poderoso enemigo amenaza el futuro de su nación.",

    tags: [
      "Marvel",
      "Black Panther",
      "Wakanda",
      "Acción",
      "Superhéroes"
    ],

    director: "Ryan Coogler",
    universe: "Marvel Cinematic Universe",
    quality: "4K / HDR"
  },

  "doctor-strange": {
    title: "Doctor Strange",
    year: "2016",
    genre: "Acción / Fantasía",
    genreFilter: "accion",
    duration: "1h 55min",
    rating: 7.5,
    popularity: 84,
    status: "DESTACADA",

    poster: "images/doctor-strange.jpg",

    accent: "#f59e0b",
    accent2: "#7c3aed",

    description:
      "Un brillante cirujano descubre el mundo de las artes místicas después de sufrir un accidente que cambia su vida.",

    tags: [
      "Marvel",
      "Doctor Strange",
      "Magia",
      "Multiverso",
      "Acción"
    ],

    director: "Scott Derrickson",
    universe: "Marvel Cinematic Universe",
    quality: "4K / HDR"
  },

  /* =======================================================
     CIENCIA FICCIÓN
     ======================================================= */

  "interstellar": {
    title: "Interstellar",
    year: "2014",
    genre: "Ciencia ficción",
    genreFilter: "ciencia-ficcion",
    duration: "2h 49min",
    rating: 8.7,
    popularity: 99,
    status: "CLÁSICO",

    poster: "images/interstellar.jpg",

    accent: "#3b82f6",
    accent2: "#7c3aed",

    description:
      "Un grupo de exploradores viaja a través de un agujero de gusano en busca de un nuevo hogar para la humanidad.",

    tags: [
      "Espacio",
      "Ciencia ficción",
      "Drama",
      "Viajes espaciales",
      "Christopher Nolan"
    ],

    director: "Christopher Nolan",
    universe: "Interstellar",
    quality: "4K / HDR"
  },

  "inception": {
    title: "Inception",
    year: "2010",
    genre: "Ciencia ficción / Thriller",
    genreFilter: "ciencia-ficcion",
    duration: "2h 28min",
    rating: 8.8,
    popularity: 96,
    status: "CLÁSICO",

    poster: "images/inception.jpg",

    accent: "#475569",
    accent2: "#2563eb",

    description:
      "Un especialista en infiltrarse en los sueños recibe la misión de implantar una idea en la mente de un objetivo.",

    tags: [
      "Ciencia ficción",
      "Sueños",
      "Thriller",
      "Christopher Nolan",
      "Acción"
    ],

    director: "Christopher Nolan",
    universe: "Inception",
    quality: "4K / HDR"
  },

  "the-matrix": {
    title: "The Matrix",
    year: "1999",
    genre: "Ciencia ficción / Acción",
    genreFilter: "ciencia-ficcion",
    duration: "2h 16min",
    rating: 8.7,
    popularity: 95,
    status: "CLÁSICO",

    poster: "images/the-matrix.jpg",

    accent: "#16a34a",
    accent2: "#052e16",

    description:
      "Neo descubre que la realidad que conoce es una simulación y se une a una rebelión contra las máquinas.",

    tags: [
      "Ciencia ficción",
      "Matrix",
      "Tecnología",
      "Acción",
      "Clásico"
    ],

    director: "Lana Wachowski y Lilly Wachowski",
    universe: "The Matrix",
    quality: "4K / HDR"
  },

  "dune": {
    title: "Dune",
    year: "2021",
    genre: "Ciencia ficción / Aventura",
    genreFilter: "ciencia-ficcion",
    duration: "2h 35min",
    rating: 8.0,
    popularity: 92,
    status: "DESTACADA",

    poster: "images/dune.jpg",

    accent: "#d97706",
    accent2: "#78350f",

    description:
      "Paul Atreides llega al planeta Arrakis y queda atrapado en un conflicto que determinará el futuro de la galaxia.",

    tags: [
      "Ciencia ficción",
      "Arrakis",
      "Aventura",
      "Épica",
      "Denis Villeneuve"
    ],

    director: "Denis Villeneuve",
    universe: "Dune",
    quality: "4K / HDR"
  },

  "dune-part-two": {
    title: "Dune: Part Two",
    year: "2024",
    genre: "Ciencia ficción / Aventura",
    genreFilter: "ciencia-ficcion",
    duration: "2h 46min",
    rating: 8.6,
    popularity: 98,
    status: "ÉPICA",

    poster: "images/dune-part-two.jpg",

    accent: "#c2410c",
    accent2: "#f59e0b",

    description:
      "Paul Atreides se une a Chani y a los Fremen mientras busca venganza y se prepara para una guerra que cambiará el destino del imperio.",

    tags: [
      "Dune",
      "Ciencia ficción",
      "Fremen",
      "Arrakis",
      "Aventura"
    ],

    director: "Denis Villeneuve",
    universe: "Dune",
    quality: "4K / HDR"
  },

  "avatar": {
    title: "Avatar",
    year: "2009",
    genre: "Ciencia ficción",
    genreFilter: "ciencia-ficcion",
    duration: "2h 42min",
    rating: 7.9,
    popularity: 93,
    status: "DESTACADA",

    poster: "images/avatar.jpg",

    accent: "#00a6c7",
    accent2: "#16a34a",

    description:
      "Un exmarine llega a Pandora y termina involucrándose con el mundo de los Na'vi mientras descubre una conexión profunda con el planeta.",

    tags: [
      "Pandora",
      "Ciencia ficción",
      "Aventura",
      "Na'vi",
      "James Cameron"
    ],

    director: "James Cameron",
    universe: "Avatar",
    quality: "4K / HDR"
  },

  "avatar-way-of-water": {
    title: "Avatar: The Way of Water",
    year: "2022",
    genre: "Ciencia ficción / Aventura",
    genreFilter: "ciencia-ficcion",
    duration: "3h 12min",
    rating: 7.5,
    popularity: 91,
    status: "POPULAR",

    poster: "images/avatar-way-of-water.jpg",

    accent: "#0284c7",
    accent2: "#06b6d4",

    description:
      "Jake Sully y Neytiri forman una familia mientras buscan refugio entre los pueblos acuáticos de Pandora.",

    tags: [
      "Avatar",
      "Pandora",
      "Océano",
      "Aventura",
      "Ciencia ficción"
    ],

    director: "James Cameron",
    universe: "Avatar",
    quality: "4K / HDR"
  },

  /* =======================================================
     DC
     ======================================================= */

  "the-batman": {
    title: "The Batman",
    year: "2022",
    genre: "Acción / Crimen",
    genreFilter: "accion",
    duration: "2h 56min",
    rating: 7.8,
    popularity: 94,
    status: "DESTACADA",

    poster: "images/the-batman.jpg",

    accent: "#b91c1c",
    accent2: "#171717",

    description:
      "Batman se enfrenta a una serie de crímenes que revelan una conspiración que conecta a las figuras más poderosas de Gotham.",

    tags: [
      "DC",
      "Batman",
      "Crimen",
      "Gotham",
      "Detective"
    ],

    director: "Matt Reeves",
    universe: "DC",
    quality: "4K / HDR"
  },

  "joker": {
    title: "Joker",
    year: "2019",
    genre: "Drama / Crimen",
    genreFilter: "drama",
    duration: "2h 2min",
    rating: 8.3,
    popularity: 95,
    status: "CLÁSICO",

    poster: "images/joker.jpg",

    accent: "#16a34a",
    accent2: "#eab308",

    description:
      "Arthur Fleck lucha por encontrar su lugar en una sociedad que poco a poco lo lleva por un camino oscuro.",

    tags: [
      "DC",
      "Joker",
      "Drama",
      "Crimen",
      "Gotham"
    ],

    director: "Todd Phillips",
    universe: "DC",
    quality: "4K / HDR"
  },

  "man-of-steel": {
    title: "Man of Steel",
    year: "2013",
    genre: "Acción / Superhéroes",
    genreFilter: "accion",
    duration: "2h 23min",
    rating: 7.0,
    popularity: 82,
    status: "DESTACADA",

    poster: "images/man-of-steel.jpg",

    accent: "#2563eb",
    accent2: "#dc2626",

    description:
      "Clark Kent debe aceptar su identidad como Superman y utilizar sus poderes para proteger la Tierra.",

    tags: [
      "DC",
      "Superman",
      "Acción",
      "Krypton",
      "Superhéroes"
    ],

    director: "Zack Snyder",
    universe: "DC",
    quality: "4K / HDR"
  },

  "the-dark-knight": {
    title: "The Dark Knight",
    year: "2008",
    genre: "Acción / Crimen",
    genreFilter: "accion",
    duration: "2h 32min",
    rating: 9.0,
    popularity: 100,
    status: "OBRA MAESTRA",

    poster: "images/the-dark-knight.jpg",

    accent: "#374151",
    accent2: "#111827",

    description:
      "Batman enfrenta al Joker, un criminal impredecible que busca sumergir Gotham en el caos.",

    tags: [
      "DC",
      "Batman",
      "Joker",
      "Crimen",
      "Christopher Nolan"
    ],

    director: "Christopher Nolan",
    universe: "DC",
    quality: "4K / HDR"
  },

  /* =======================================================
     ACCIÓN
     ======================================================= */

  "john-wick": {
    title: "John Wick",
    year: "2014",
    genre: "Acción / Thriller",
    genreFilter: "accion",
    duration: "1h 41min",
    rating: 7.4,
    popularity: 88,
    status: "POPULAR",

    poster: "images/john-wick.jpg",

    accent: "#dc2626",
    accent2: "#111827",

    description:
      "Un antiguo asesino regresa al mundo criminal después de que un grupo de delincuentes destruye lo poco que le quedaba.",

    tags: [
      "Acción",
      "John Wick",
      "Crimen",
      "Thriller",
      "Neo-noir"
    ],

    director: "Chad Stahelski",
    universe: "John Wick",
    quality: "4K / HDR"
  },

  "john-wick-chapter-4": {
    title: "John Wick: Chapter 4",
    year: "2023",
    genre: "Acción / Thriller",
    genreFilter: "accion",
    duration: "2h 49min",
    rating: 7.6,
    popularity: 93,
    status: "POPULAR",

    poster: "images/john-wick-chapter-4.jpg",

    accent: "#dc2626",
    accent2: "#f59e0b",

    description:
      "John Wick descubre una manera de derrotar a la Alta Mesa mientras se enfrenta a nuevos enemigos alrededor del mundo.",

    tags: [
      "Acción",
      "John Wick",
      "Crimen",
      "Combate",
      "Thriller"
    ],

    director: "Chad Stahelski",
    universe: "John Wick",
    quality: "4K / HDR"
  },

  "top-gun-maverick": {
    title: "Top Gun: Maverick",
    year: "2022",
    genre: "Acción / Drama",
    genreFilter: "accion",
    duration: "2h 10min",
    rating: 8.2,
    popularity: 90,
    status: "DESTACADA",

    poster: "images/top-gun-maverick.jpg",

    accent: "#2563eb",
    accent2: "#0f172a",

    description:
      "Maverick regresa para entrenar a una nueva generación de pilotos y enfrentarse a una misión extremadamente peligrosa.",

    tags: [
      "Acción",
      "Aviación",
      "Drama",
      "Pilotos",
      "Tom Cruise"
    ],

    director: "Joseph Kosinski",
    universe: "Top Gun",
    quality: "4K / HDR"
  },

  "mission-impossible-fallout": {
    title: "Mission: Impossible — Fallout",
    year: "2018",
    genre: "Acción / Espionaje",
    genreFilter: "accion",
    duration: "2h 27min",
    rating: 7.7,
    popularity: 87,
    status: "POPULAR",

    poster: "images/mission-impossible-fallout.jpg",

    accent: "#1d4ed8",
    accent2: "#dc2626",

    description:
      "Ethan Hunt y su equipo deben corregir una misión que salió mal mientras una amenaza global se acerca.",

    tags: [
      "Acción",
      "Espionaje",
      "Mission Impossible",
      "Thriller",
      "Tom Cruise"
    ],

    director: "Christopher McQuarrie",
    universe: "Mission: Impossible",
    quality: "4K / HDR"
  },

  /* =======================================================
     ANIMACIÓN
     ======================================================= */

  "toy-story": {
    title: "Toy Story",
    year: "1995",
    genre: "Animación / Aventura",
    genreFilter: "animacion",
    duration: "1h 21min",
    rating: 8.3,
    popularity: 91,
    status: "CLÁSICO",

    poster: "images/toy-story.jpg",

    accent: "#2563eb",
    accent2: "#f59e0b",

    description:
      "Los juguetes de Andy cobran vida cuando los humanos no están presentes y deben adaptarse a la llegada de un nuevo juguete.",

    tags: [
      "Pixar",
      "Animación",
      "Aventura",
      "Familia",
      "Woody"
    ],

    director: "John Lasseter",
    universe: "Toy Story",
    quality: "4K"
  },

  "coco": {
    title: "Coco",
    year: "2017",
    genre: "Animación / Familia",
    genreFilter: "animacion",
    duration: "1h 45min",
    rating: 8.4,
    popularity: 94,
    status: "DESTACADA",

    poster: "images/coco.jpg",

    accent: "#f97316",
    accent2: "#7c3aed",

    description:
      "Miguel viaja accidentalmente al mundo de los muertos y descubre secretos de su familia mientras busca cumplir su sueño musical.",

    tags: [
      "Pixar",
      "Animación",
      "México",
      "Familia",
      "Música"
    ],

    director: "Lee Unkrich",
    universe: "Coco",
    quality: "4K HDR"
  },

  "spider-man-into-the-spider-verse": {
    title: "Spider-Man: Into the Spider-Verse",
    year: "2018",
    genre: "Animación / Acción",
    genreFilter: "animacion",
    duration: "1h 57min",
    rating: 8.4,
    popularity: 92,
    status: "POPULAR",

    poster: "images/spider-man-into-the-spider-verse.jpg",

    accent: "#ec4899",
    accent2: "#2563eb",

    description:
      "Miles Morales se convierte en Spider-Man y descubre que existen múltiples versiones del héroe provenientes de diferentes dimensiones.",

    tags: [
      "Marvel",
      "Spider-Man",
      "Animación",
      "Multiverso",
      "Miles Morales"
    ],

    director: "Bob Persichetti, Peter Ramsey y Rodney Rothman",
    universe: "Spider-Verse",
    quality: "4K HDR"
  },

  /* =======================================================
     DRAMA
     ======================================================= */

  "the-shawshank-redemption": {
    title: "The Shawshank Redemption",
    year: "1994",
    genre: "Drama",
    genreFilter: "drama",
    duration: "2h 22min",
    rating: 9.3,
    popularity: 97,
    status: "OBRA MAESTRA",

    poster: "images/shawshank-redemption.jpg",

    accent: "#64748b",
    accent2: "#0f172a",

    description:
      "Un hombre condenado injustamente encuentra esperanza y amistad mientras pasa años dentro de una prisión.",

    tags: [
      "Drama",
      "Prisión",
      "Amistad",
      "Esperanza",
      "Clásico"
    ],

    director: "Frank Darabont",
    universe: "The Shawshank Redemption",
    quality: "4K"
  },

  "forrest-gump": {
    title: "Forrest Gump",
    year: "1994",
    genre: "Drama",
    genreFilter: "drama",
    duration: "2h 22min",
    rating: 8.8,
    popularity: 94,
    status: "CLÁSICO",

    poster: "images/forrest-gump.jpg",

    accent: "#3b82f6",
    accent2: "#eab308",

    description:
      "Forrest Gump vive una vida extraordinaria mientras atraviesa algunos de los momentos más importantes de la historia estadounidense.",

    tags: [
      "Drama",
      "Romance",
      "Historia",
      "Clásico",
      "Tom Hanks"
    ],

    director: "Robert Zemeckis",
    universe: "Forrest Gump",
    quality: "4K"
  },

  /* =======================================================
     TERROR / THRILLER
     ======================================================= */

  "a-quiet-place": {
    title: "A Quiet Place",
    year: "2018",
    genre: "Terror / Thriller",
    genreFilter: "terror",
    duration: "1h 30min",
    rating: 7.5,
    popularity: 86,
    status: "TERROR",

    poster: "images/a-quiet-place.jpg",

    accent: "#65a30d",
    accent2: "#111827",

    description:
      "Una familia intenta sobrevivir en un mundo dominado por criaturas que cazan cualquier sonido.",

    tags: [
      "Terror",
      "Supervivencia",
      "Thriller",
      "Monstruos",
      "Familia"
    ],

    director: "John Krasinski",
    universe: "A Quiet Place",
    quality: "4K HDR"
  },

  "it": {
    title: "It",
    year: "2017",
    genre: "Terror",
    genreFilter: "terror",
    duration: "2h 15min",
    rating: 7.3,
    popularity: 85,
    status: "TERROR",

    poster: "images/it.jpg",

    accent: "#dc2626",
    accent2: "#facc15",

    description:
      "Un grupo de niños se enfrenta a una entidad aterradora que adopta la forma de Pennywise.",

    tags: [
      "Terror",
      "Pennywise",
      "Stephen King",
      "Suspenso",
      "Horror"
    ],

    director: "Andy Muschietti",
    universe: "It",
    quality: "4K HDR"
  },

  /* =======================================================
     COMEDIA
     ======================================================= */

  "the-hangover": {
    title: "The Hangover",
    year: "2009",
    genre: "Comedia",
    genreFilter: "comedia",
    duration: "1h 40min",
    rating: 7.7,
    popularity: 84,
    status: "COMEDIA",

    poster: "images/the-hangove.jpg",

    accent: "#f59e0b",
    accent2: "#f97316",

    description:
      "Tres amigos despiertan después de una noche inolvidable en Las Vegas y deben descubrir qué ocurrió.",

    tags: [
      "Comedia",
      "Las Vegas",
      "Amigos",
      "Viaje",
      "Adultos"
    ],

    director: "Todd Phillips",
    universe: "The Hangover",
    quality: "HD"
  },

  "free-guy": {
    title: "Free Guy",
    year: "2021",
    genre: "Comedia / Acción",
    genreFilter: "comedia",
    duration: "1h 55min",
    rating: 7.1,
    popularity: 82,
    status: "POPULAR",

    poster: "images/free-guy.jpg",

    accent: "#2563eb",
    accent2: "#22c55e",

    description:
      "Un personaje secundario de un videojuego descubre que vive dentro de una simulación y decide convertirse en el héroe de su propia historia.",

    tags: [
      "Comedia",
      "Videojuegos",
      "Acción",
      "Ryan Reynolds",
      "Ciencia ficción"
    ],

    director: "Shawn Levy",
    universe: "Free Guy",
    quality: "4K HDR"
  },

  /* =======================================================
     FANTASÍA / AVENTURA
     ======================================================= */

  "harry-potter-philosophers-stone": {
    title: "Harry Potter and the Philosopher's Stone",
    year: "2001",
    genre: "Fantasía / Aventura",
    genreFilter: "aventura",
    duration: "2h 32min",
    rating: 7.6,
    popularity: 95,
    status: "CLÁSICO",

    poster: "images/harry-potter-philosophers-stone.jpg",

    accent: "#7c3aed",
    accent2: "#f59e0b",

    description:
      "Harry Potter descubre que es un mago y comienza su primer año en Hogwarts, donde descubre un mundo completamente nuevo.",

    tags: [
      "Harry Potter",
      "Magia",
      "Hogwarts",
      "Fantasía",
      "Aventura"
    ],

    director: "Chris Columbus",
    universe: "Harry Potter",
    quality: "4K HDR"
  },

  "lord-of-the-rings-fellowship": {
    title: "The Lord of the Rings: The Fellowship of the Ring",
    year: "2001",
    genre: "Fantasía / Aventura",
    genreFilter: "aventura",
    duration: "2h 58min",
    rating: 8.8,
    popularity: 97,
    status: "ÉPICA",

    poster: "images/lord-of-the-rings-fellowship.jpg",

    accent: "#15803d",
    accent2: "#a16207",

    description:
      "Frodo recibe la misión de destruir el Anillo Único antes de que Sauron pueda recuperarlo.",

    tags: [
      "Fantasía",
      "Tierra Media",
      "Aventura",
      "Anillo",
      "Épica"
    ],

    director: "Peter Jackson",
    universe: "Middle-earth",
    quality: "4K HDR"
  },

  /* =======================================================
     CLÁSICOS
     ======================================================= */

  "the-godfather": {
    title: "The Godfather",
    year: "1972",
    genre: "Drama / Crimen",
    genreFilter: "drama",
    duration: "2h 55min",
    rating: 9.2,
    popularity: 96,
    status: "OBRA MAESTRA",

    poster: "images/the-godfather.jpg",

    accent: "#92400e",
    accent2: "#111827",

    description:
      "La historia de una poderosa familia criminal y la transformación de Michael Corleone dentro del mundo de la mafia.",

    tags: [
      "Crimen",
      "Mafia",
      "Drama",
      "Clásico",
      "Familia"
    ],

    director: "Francis Ford Coppola",
    universe: "The Godfather",
    quality: "4K"
  },

  "pulp-fiction": {
    title: "Pulp Fiction",
    year: "1994",
    genre: "Crimen / Drama",
    genreFilter: "drama",
    duration: "2h 34min",
    rating: 8.9,
    popularity: 95,
    status: "CLÁSICO",

    poster: "images/pulp-fiction.jpg",

    accent: "#eab308",
    accent2: "#991b1b",

    description:
      "Varias historias criminales se conectan en Los Ángeles a través de personajes, situaciones y decisiones inesperadas.",

    tags: [
      "Crimen",
      "Drama",
      "Tarantino",
      "Clásico",
      "Thriller"
    ],

    director: "Quentin Tarantino",
    universe: "Pulp Fiction",
    quality: "4K"
  },

  "fight-club": {
    title: "Fight Club",
    year: "1999",
    genre: "Drama / Thriller",
    genreFilter: "drama",
    duration: "2h 19min",
    rating: 8.8,
    popularity: 94,
    status: "CLÁSICO",

    poster: "images/fight-club.jpg",

    accent: "#dc2626",
    accent2: "#111827",

    description:
      "Un hombre atrapado en una vida rutinaria conoce a Tyler Durden y comienza a participar en un misterioso club de lucha.",

    tags: [
      "Drama",
      "Thriller",
      "Clásico",
      "David Fincher",
      "Suspenso"
    ],

    director: "David Fincher",
    universe: "Fight Club",
    quality: "4K"
  }

};
