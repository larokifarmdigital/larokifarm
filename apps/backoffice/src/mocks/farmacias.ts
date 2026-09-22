import type { Farmacia } from '@/types/content';

const img = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const MOCK_FARMACIAS: Farmacia[] = [
  {
    id: 'farm_torrents',
    slug: 'torrents',
    nombre: 'Farmàcia Torrents',
    status: 'published',
    idiomasActivos: ['es', 'ca'],
    ciudad: 'Barcelona',
    telefono: '+34 934 12 34 56',
    email: 'hola@farmaciatorrents.com',
    whatsapp: '+34 600 12 34 56',
    web: 'https://farmaciatorrents.com',
    titular: 'Farm. Marta Torrents Vidal',
    numeroColegiado: '08-3421',
    descripcionCorta: {
      es: 'Tu farmacia de confianza en el Eixample, con servicio de dermofarmacia y consejo personalizado.',
      ca: 'La teva farmàcia de confiança a l’Eixample, amb servei de dermofarmàcia i consell personalitzat.',
    },
    descripcionLarga: {
      es: '<p>Somos una farmacia familiar con tres generaciones al servicio del barrio. Ofrecemos atención personalizada, servicio a domicilio y una amplia gama de dermofarmacia y cosmética natural.</p><p>Colaboramos con médicos y nutricionistas locales para dar el mejor consejo a cada paciente.</p>',
      ca: '<p>Som una farmàcia familiar amb tres generacions al servei del barri. Oferim atenció personalitzada, servei a domicili i una àmplia gamma de dermofarmàcia i cosmètica natural.</p>',
    },
    logo: {
      id: 'logo_torrents',
      url: img('torrents-logo', 240, 240),
      alt: { es: 'Logotipo Farmàcia Torrents' },
    },
    heroImages: [
      {
        id: 'hero_torrents_1',
        url: img('torrents-hero-1', 1920, 800),
        alt: { es: 'Fachada de la Farmàcia Torrents en el Eixample de Barcelona' },
      },
      {
        id: 'hero_torrents_2',
        url: img('torrents-hero-2', 1920, 800),
        alt: { es: 'Interior con mostrador de dermofarmacia' },
      },
    ],
    direccion: {
      calle: 'Carrer d’Aragó',
      numero: '212',
      ciudad: 'Barcelona',
      provincia: 'Barcelona',
      cp: '08011',
      pais: 'España',
    },
    googleMapsUrl: 'https://maps.google.com/?q=Farmacia+Torrents+Barcelona',
    horarios: [
      { dia: 'lun', tramos: [{ abre: '09:00', cierra: '14:00' }, { abre: '17:00', cierra: '20:30' }] },
      { dia: 'mar', tramos: [{ abre: '09:00', cierra: '14:00' }, { abre: '17:00', cierra: '20:30' }] },
      { dia: 'mie', tramos: [{ abre: '09:00', cierra: '14:00' }, { abre: '17:00', cierra: '20:30' }] },
      { dia: 'jue', tramos: [{ abre: '09:00', cierra: '14:00' }, { abre: '17:00', cierra: '20:30' }] },
      { dia: 'vie', tramos: [{ abre: '09:00', cierra: '14:00' }, { abre: '17:00', cierra: '20:30' }] },
      { dia: 'sab', tramos: [{ abre: '09:30', cierra: '14:00' }] },
      { dia: 'dom', tramos: [], cerrado: true },
    ],
    redes: {
      instagram: 'https://instagram.com/farmaciatorrents',
      facebook: 'https://facebook.com/farmaciatorrents',
    },
    servicios: [
      {
        id: 'srv_derm',
        icono: 'droplet',
        nombre: { es: 'Consulta dermofarmacéutica', ca: 'Consulta dermofarmacèutica' },
        descripcion: {
          es: 'Diagnóstico de piel gratuito con equipo profesional. Cita previa.',
          ca: 'Diagnòstic de pell gratuït amb equip professional. Cita prèvia.',
        },
        orden: 0,
      },
      {
        id: 'srv_dom',
        icono: 'truck',
        nombre: { es: 'Entrega a domicilio', ca: 'Lliurament a domicili' },
        descripcion: {
          es: 'Gratis en pedidos superiores a 30€ dentro del Eixample.',
          ca: 'Gratis en comandes superiors a 30€ dins l’Eixample.',
        },
        orden: 1,
      },
      {
        id: 'srv_nutri',
        icono: 'apple',
        nombre: { es: 'Asesoría en nutrición', ca: 'Assessorament en nutrició' },
        descripcion: { es: 'Sesiones con nutricionista colegiada cada jueves.' },
        orden: 2,
      },
    ],
    faqs: [
      {
        id: 'faq_1',
        pregunta: { es: '¿Hacéis guardia nocturna?', ca: 'Feu guàrdia nocturna?' },
        respuesta: {
          es: 'Sí, participamos en el turno de guardia del Eixample. Consulta el calendario oficial del COFB.',
          ca: 'Sí, participem en el torn de guàrdia de l’Eixample. Consulta el calendari oficial del COFB.',
        },
        orden: 0,
      },
      {
        id: 'faq_2',
        pregunta: { es: '¿Aceptáis recetas electrónicas?' },
        respuesta: { es: 'Sí, todas las recetas electrónicas del CatSalut y del INSS.' },
        orden: 1,
      },
    ],
    resenas: [
      {
        id: 'res_1',
        autor: 'Laia M.',
        puntuacion: 5,
        texto: 'Atención inmejorable, siempre me resuelven todas las dudas.',
        fecha: '2026-07-14',
        fuente: 'google',
      },
      {
        id: 'res_2',
        autor: 'Jordi P.',
        puntuacion: 5,
        texto: 'La farmacia de toda la vida, con productos de dermofarmacia excelentes.',
        fecha: '2026-06-02',
        fuente: 'google',
      },
    ],
    seo: {
      title: {
        es: 'Farmàcia Torrents · Farmacia en el Eixample de Barcelona',
        ca: 'Farmàcia Torrents · Farmàcia a l’Eixample de Barcelona',
      },
      description: {
        es: 'Farmacia familiar en el Eixample con dermofarmacia, servicio a domicilio y consejo personalizado.',
      },
    },
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2026-09-15T14:22:00.000Z',
    lastEditedBy: 'Marta Torrents',
  },
  {
    id: 'farm_chamarro',
    slug: 'chamarro',
    nombre: 'Farmacia Chamarro',
    status: 'published',
    idiomasActivos: ['es'],
    ciudad: 'Huacho',
    telefono: '+51 987 654 321',
    email: 'contacto@farmaciachamarro.pe',
    whatsapp: '+51 987 654 321',
    web: 'https://farmaciachamarro.pe',
    titular: 'QF. Ana Chamarro Ríos',
    numeroColegiado: 'CQFP-14235',
    descripcionCorta: {
      es: 'Farmacia comunitaria en el centro de Huacho con atención farmacéutica y precios accesibles.',
    },
    descripcionLarga: {
      es: '<p>Servimos a la comunidad de Huacho desde 2003 con productos originales, asesoría profesional y campañas de salud gratuitas cada mes.</p>',
    },
    logo: {
      id: 'logo_chamarro',
      url: img('chamarro-logo', 240, 240),
      alt: { es: 'Logotipo Farmacia Chamarro' },
    },
    heroImages: [
      {
        id: 'hero_chamarro_1',
        url: img('chamarro-hero-1', 1920, 800),
        alt: { es: 'Fachada de la Farmacia Chamarro en Huacho' },
      },
    ],
    direccion: {
      calle: 'Av. 28 de Julio',
      numero: '432',
      ciudad: 'Huacho',
      provincia: 'Lima',
      cp: '15130',
      pais: 'Perú',
    },
    googleMapsUrl: 'https://maps.google.com/?q=Farmacia+Chamarro+Huacho',
    horarios: [
      { dia: 'lun', tramos: [{ abre: '08:00', cierra: '22:00' }] },
      { dia: 'mar', tramos: [{ abre: '08:00', cierra: '22:00' }] },
      { dia: 'mie', tramos: [{ abre: '08:00', cierra: '22:00' }] },
      { dia: 'jue', tramos: [{ abre: '08:00', cierra: '22:00' }] },
      { dia: 'vie', tramos: [{ abre: '08:00', cierra: '22:00' }] },
      { dia: 'sab', tramos: [{ abre: '08:00', cierra: '22:00' }] },
      { dia: 'dom', tramos: [{ abre: '09:00', cierra: '20:00' }] },
    ],
    redes: {
      instagram: 'https://instagram.com/farmaciachamarro',
    },
    servicios: [
      {
        id: 'srv_ch_1',
        icono: 'stethoscope',
        nombre: { es: 'Control de presión gratuito' },
        descripcion: { es: 'Todos los sábados de 9:00 a 12:00.' },
        orden: 0,
      },
      {
        id: 'srv_ch_2',
        icono: 'motorcycle',
        nombre: { es: 'Delivery en 30 minutos' },
        descripcion: { es: 'Cobertura en toda Huacho y Santa María.' },
        orden: 1,
      },
    ],
    faqs: [
      {
        id: 'faq_ch_1',
        pregunta: { es: '¿Aceptan tarjetas?' },
        respuesta: { es: 'Sí, Visa, Mastercard, Yape y Plin.' },
        orden: 0,
      },
    ],
    resenas: [],
    seo: {
      title: { es: 'Farmacia Chamarro · Huacho' },
      description: { es: 'Farmacia comunitaria en Huacho con delivery y precios accesibles.' },
    },
    createdAt: '2023-03-20T09:00:00.000Z',
    updatedAt: '2026-08-30T11:00:00.000Z',
    lastEditedBy: 'Ana Chamarro',
  },
  {
    id: 'farm_bosque',
    slug: 'farmacia-del-bosque',
    nombre: 'Farmacia del Bosque',
    status: 'draft',
    idiomasActivos: ['es'],
    ciudad: 'Madrid',
    descripcionCorta: {
      es: 'Nueva farmacia en Chamberí especializada en fitoterapia.',
    },
    descripcionLarga: {},
    heroImages: [],
    horarios: [],
    servicios: [],
    faqs: [],
    resenas: [],
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-10T09:00:00.000Z',
  },
];
