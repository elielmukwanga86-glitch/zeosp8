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
  clockDone: "C’est noté",
  clockFlagged: "Pointage enregistré, il sera vérifié",
  noShiftNow: "Pas de travail prévu maintenant",
  qrUnknown: "QR code inconnu",
  gpsAsk: "Votre position est demandée une seule fois, pour ce pointage",
  back: "Retour",
  instructions: "Consignes",
  codes: "Codes d’accès",
  absenceTitle: "Je préviens de mon absence",
  fromDay: "Du",
  toDay: "Au",
  reasonSick: "Malade",
  reasonFamily: "Famille",
  reasonOther: "Autre",
  proof: "Photo du justificatif (facultatif)",
  send: "Envoyer",
  absenceSent: "Votre responsable est prévenu",
  error: "Erreur, réessayez",
  arrivedAt: "Arrivée",
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
    clockDone: "Done",
    clockFlagged: "Saved, it will be checked",
    noShiftNow: "No work planned now",
    qrUnknown: "Unknown QR code",
    gpsAsk: "Your location is asked only once, for this check-in",
    back: "Back",
    instructions: "Instructions",
    codes: "Access codes",
    absenceTitle: "I'm reporting my absence",
    fromDay: "From",
    toDay: "To",
    reasonSick: "Sick",
    reasonFamily: "Family",
    reasonOther: "Other",
    proof: "Photo of the document (optional)",
    send: "Send",
    absenceSent: "Your manager has been told",
    error: "Error, try again",
    arrivedAt: "Arrived",
  },
  pt: {
    hello: 'Olá', today: 'Hoje', noShift: 'Sem trabalho previsto hoje', clockIn: 'Cheguei', clockOut: 'Vou embora',
    absence: 'Estou ausente', stock: 'Falta um produto', messages: 'Mensagens', language: 'Idioma', logout: 'Sair',
    phone: 'O meu número de telefone', sendLink: 'Receber o meu link por SMS', linkSent: 'Se este número for conhecido, chega um SMS em poucos segundos.',
    linkExpired: 'Este link já não funciona. Peça um novo link.', tooMany: 'Pedidos a mais. Espere 15 minutos.',
    invalidPhone: 'Número inválido', soon: 'Em breve',
    clockDone: "Registado",
    clockFlagged: "Registado, será verificado",
    noShiftNow: "Sem trabalho previsto agora",
    qrUnknown: "Código QR desconhecido",
    gpsAsk: "A sua localização é pedida só uma vez, para este registo",
    back: "Voltar",
    instructions: "Instruções",
    codes: "Códigos de acesso",
    absenceTitle: "Aviso a minha ausência",
    fromDay: "De",
    toDay: "Até",
    reasonSick: "Doente",
    reasonFamily: "Família",
    reasonOther: "Outro",
    proof: "Foto do justificativo (opcional)",
    send: "Enviar",
    absenceSent: "O seu responsável foi avisado",
    error: "Erro, tente de novo",
    arrivedAt: "Chegada",
  },
  es: {
    hello: 'Hola', today: 'Hoy', noShift: 'No hay trabajo previsto hoy', clockIn: 'Llego', clockOut: 'Me voy',
    absence: 'Estoy ausente', stock: 'Falta un producto', messages: 'Mensajes', language: 'Idioma', logout: 'Cerrar sesión',
    phone: 'Mi número de teléfono', sendLink: 'Recibir mi enlace por SMS', linkSent: 'Si este número es conocido, llegará un SMS en unos segundos.',
    linkExpired: 'Este enlace ya no funciona. Pida un nuevo enlace.', tooMany: 'Demasiadas solicitudes. Espere 15 minutos.',
    invalidPhone: 'Número no válido', soon: 'Próximamente',
    clockDone: "Registrado",
    clockFlagged: "Registrado, se verificará",
    noShiftNow: "No hay trabajo previsto ahora",
    qrUnknown: "Código QR desconocido",
    gpsAsk: "Su ubicación se pide una sola vez, para este fichaje",
    back: "Volver",
    instructions: "Instrucciones",
    codes: "Códigos de acceso",
    absenceTitle: "Aviso de mi ausencia",
    fromDay: "Desde",
    toDay: "Hasta",
    reasonSick: "Enfermo",
    reasonFamily: "Familia",
    reasonOther: "Otro",
    proof: "Foto del justificante (opcional)",
    send: "Enviar",
    absenceSent: "Su responsable ha sido avisado",
    error: "Error, inténtelo de nuevo",
    arrivedAt: "Llegada",
  },
  ar: {
    hello: 'مرحبا', today: 'اليوم', noShift: 'لا يوجد عمل اليوم', clockIn: 'وصلت', clockOut: 'أغادر',
    absence: 'أنا غائب', stock: 'ينقص منتج', messages: 'الرسائل', language: 'اللغة', logout: 'تسجيل الخروج',
    phone: 'رقم هاتفي', sendLink: 'استلام الرابط برسالة SMS', linkSent: 'إذا كان الرقم معروفًا، ستصلك رسالة خلال ثوانٍ.',
    linkExpired: 'هذا الرابط لم يعد يعمل. اطلب رابطًا جديدًا.', tooMany: 'طلبات كثيرة. انتظر 15 دقيقة.',
    invalidPhone: 'رقم غير صالح', soon: 'قريبًا',
    clockDone: "تم التسجيل",
    clockFlagged: "تم التسجيل وسيتم التحقق منه",
    noShiftNow: "لا يوجد عمل الآن",
    qrUnknown: "رمز QR غير معروف",
    gpsAsk: "يُطلب موقعك مرة واحدة فقط لهذا التسجيل",
    back: "رجوع",
    instructions: "التعليمات",
    codes: "رموز الدخول",
    absenceTitle: "أبلغ عن غيابي",
    fromDay: "من",
    toDay: "إلى",
    reasonSick: "مريض",
    reasonFamily: "عائلة",
    reasonOther: "أخرى",
    proof: "صورة المستند (اختياري)",
    send: "إرسال",
    absenceSent: "تم إبلاغ مسؤولك",
    error: "خطأ، حاول مرة أخرى",
    arrivedAt: "الوصول",
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
