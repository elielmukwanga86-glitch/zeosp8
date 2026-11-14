/**
 * Textes de l'interface agent (mobile) : français, anglais, portugais, espagnol, arabe.
 * Phrases très courtes, vocabulaire simple, toujours accompagnées d'une icône.
 */
export const AGENT_LOCALES = ['fr', 'en', 'pt', 'es', 'ar'] as const;
export type AgentLocale = (typeof AGENT_LOCALES)[number];

export const LOCALE_NAMES: Record<AgentLocale, string> = {
  fr: 'Français', en: 'English', pt: 'Português', es: 'Español', ar: 'العربية',
};

const fr = {
  hello: 'Bonjour',
  today: "Aujourd'hui",
  noShift: "Pas de travail prévu aujourd'hui",
  clockIn: "J'arrive",
  clockOut: 'Je pars',
  absence: 'Je suis absent',
  stock: 'Il manque un produit',
  messages: 'Messages',
  language: 'Langue',
  logout: 'Me déconnecter',
  phone: 'Mon numéro de téléphone',
  sendLink: 'Recevoir mon lien par SMS',
  linkSent: 'Si ce numéro est connu, un SMS arrive dans quelques secondes.',
  linkExpired: 'Ce lien ne marche plus. Demandez un nouveau lien.',
  tooMany: 'Trop de demandes. Attendez 15 minutes.',
  invalidPhone: 'Numéro invalide',
  soon: 'Bientôt disponible',
} as const;

export type AgentDictionary = Record<keyof typeof fr, string>;

const DICTIONARIES: Record<AgentLocale, AgentDictionary> = {
  fr,
  en: {
    hello: 'Hello', today: 'Today', noShift: 'No work planned today', clockIn: "I'm here", clockOut: "I'm leaving",
    absence: "I'm absent", stock: 'A product is missing', messages: 'Messages', language: 'Language', logout: 'Log out',
    phone: 'My phone number', sendLink: 'Get my link by SMS', linkSent: 'If this number is known, an SMS will arrive in a few seconds.',
    linkExpired: 'This link no longer works. Ask for a new link.', tooMany: 'Too many requests. Wait 15 minutes.',
    invalidPhone: 'Invalid number', soon: 'Coming soon',
  },
  pt: {
    hello: 'Olá', today: 'Hoje', noShift: 'Sem trabalho previsto hoje', clockIn: 'Cheguei', clockOut: 'Vou embora',
    absence: 'Estou ausente', stock: 'Falta um produto', messages: 'Mensagens', language: 'Idioma', logout: 'Sair',
    phone: 'O meu número de telefone', sendLink: 'Receber o meu link por SMS', linkSent: 'Se este número for conhecido, chega um SMS em poucos segundos.',
    linkExpired: 'Este link já não funciona. Peça um novo link.', tooMany: 'Pedidos a mais. Espere 15 minutos.',
    invalidPhone: 'Número inválido', soon: 'Em breve',
  },
  es: {
    hello: 'Hola', today: 'Hoy', noShift: 'No hay trabajo previsto hoy', clockIn: 'Llego', clockOut: 'Me voy',
    absence: 'Estoy ausente', stock: 'Falta un producto', messages: 'Mensajes', language: 'Idioma', logout: 'Cerrar sesión',
    phone: 'Mi número de teléfono', sendLink: 'Recibir mi enlace por SMS', linkSent: 'Si este número es conocido, llegará un SMS en unos segundos.',
    linkExpired: 'Este enlace ya no funciona. Pida un nuevo enlace.', tooMany: 'Demasiadas solicitudes. Espere 15 minutos.',
    invalidPhone: 'Número no válido', soon: 'Próximamente',
  },
  ar: {
    hello: 'مرحبا', today: 'اليوم', noShift: 'لا يوجد عمل اليوم', clockIn: 'وصلت', clockOut: 'أغادر',
    absence: 'أنا غائب', stock: 'ينقص منتج', messages: 'الرسائل', language: 'اللغة', logout: 'تسجيل الخروج',
    phone: 'رقم هاتفي', sendLink: 'استلام الرابط برسالة SMS', linkSent: 'إذا كان الرقم معروفًا، ستصلك رسالة خلال ثوانٍ.',
    linkExpired: 'هذا الرابط لم يعد يعمل. اطلب رابطًا جديدًا.', tooMany: 'طلبات كثيرة. انتظر 15 دقيقة.',
    invalidPhone: 'رقم غير صالح', soon: 'قريبًا',
  },
};

export function isAgentLocale(value: unknown): value is AgentLocale {
  return typeof value === 'string' && (AGENT_LOCALES as readonly string[]).includes(value);
}

export function getAgentDictionary(locale: AgentLocale): AgentDictionary {
  return DICTIONARIES[locale];
}

export function localeDirection(locale: AgentLocale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export const LOCALE_COOKIE = 'vacatio_lang';
