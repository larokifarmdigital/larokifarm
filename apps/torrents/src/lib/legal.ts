import type { Locale } from '@/lib/i18n';

/**
 * Textos legales por defecto (aviso legal y política de privacidad).
 *
 * Se usan cuando el campo correspondiente de Sanity está vacío para ese idioma.
 * El contenido ya incluye el título (h1), porque la página no pinta título propio:
 * todo lo visible procede de aquí o de Sanity.
 *
 * Versión corregida y ajustada a la web real (sin analítica ni publicidad; el mapa
 * de Google se carga solo bajo clic). Traducciones CA/EN pendientes de revisión
 * jurídica; el texto base validado es el español.
 */

const EMAIL = 'farmaciatorrentsbcn@gmail.com';
const MAIL = `<a href="mailto:${EMAIL}">${EMAIL}</a>`;
const WEB = '<a href="https://www.farmaciapediatrica.com" target="_blank" rel="noopener noreferrer">www.farmaciapediatrica.com</a>';
const AEPD = '<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">www.aepd.es</a>';
const GOOGLE_PRIV_ES = '<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">política de privacidad de Google</a>';
const GOOGLE_PRIV_CA = '<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">política de privacitat de Google</a>';
const GOOGLE_PRIV_EN = '<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google\'s privacy policy</a>';

export type LegalTextos = { avisoLegal: string; politicaPrivacidad: string };

export const LEGAL: Record<Locale, LegalTextos> = {
  es: {
    avisoLegal: `
<h1>Aviso legal</h1>
<p><strong>Farmacia Lda. Gloria Torrents Grau</strong>, responsable del sitio web, en adelante <strong>RESPONSABLE</strong>, pone a disposición de los usuarios el presente documento, con el que pretende dar cumplimiento a las obligaciones dispuestas en la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSICE), BOE N.º 166, así como informar a todos los usuarios del sitio web respecto a cuáles son las condiciones de uso.</p>
<p>Toda persona que acceda a este sitio web asume el papel de usuario, comprometiéndose a la observancia y cumplimiento riguroso de las disposiciones aquí dispuestas, así como a cualquier otra disposición legal que fuera de aplicación.</p>
<p>Farmacia Lda. Gloria Torrents Grau se reserva el derecho de modificar cualquier tipo de información que pudiera aparecer en el sitio web, sin que exista obligación de preavisar o poner en conocimiento de los usuarios dichas obligaciones, entendiéndose como suficiente la publicación en el sitio web de Farmacia Lda. Gloria Torrents Grau.</p>
<h2>1. Datos identificativos</h2>
<ul>
<li><strong>Nombre de dominio:</strong> ${WEB}</li>
<li><strong>Nombre comercial:</strong> Farmàcia Pediàtrica Torrents</li>
<li><strong>Denominación social:</strong> Farmacia Lda. Gloria Torrents Grau</li>
<li><strong>NIF:</strong> 77092934Q</li>
<li><strong>Domicilio social:</strong> C/ De Roger de Flor, 166 - 08013 Barcelona</li>
<li><strong>Teléfono:</strong> 932461228</li>
<li><strong>E-mail:</strong> ${MAIL}</li>
</ul>
<h2>2. Derechos de propiedad intelectual e industrial</h2>
<p>El sitio web, incluyendo a título enunciativo pero no limitativo su programación, edición, compilación y demás elementos necesarios para su funcionamiento, los diseños, logotipos, texto y/o gráficos, son propiedad del <strong>RESPONSABLE</strong> o, si es el caso, dispone de licencia o autorización expresa por parte de los autores. Todos los contenidos del sitio web se encuentran debidamente protegidos por la normativa de propiedad intelectual e industrial.</p>
<p>Independientemente de la finalidad para la que fueran destinados, la reproducción total o parcial, uso, explotación, distribución y comercialización, requiere en todo caso la autorización escrita previa por parte del <strong>RESPONSABLE</strong>. Cualquier uso no autorizado previamente se considera un incumplimiento grave de los derechos de propiedad intelectual o industrial del autor.</p>
<p>Los diseños, logotipos, texto y/o gráficos ajenos al <strong>RESPONSABLE</strong> y que pudieran aparecer en el sitio web, pertenecen a sus respectivos propietarios, siendo ellos mismos responsables de cualquier posible controversia que pudiera suscitarse respecto a los mismos. El <strong>RESPONSABLE</strong> autoriza expresamente a que terceros puedan redirigir directamente a los contenidos concretos del sitio web, y en todo caso redirigir al sitio web principal de ${WEB}</p>
<p>El <strong>RESPONSABLE</strong> reconoce a favor de sus titulares los correspondientes derechos de propiedad intelectual e industrial, no implicando su sola mención o aparición en el sitio web la existencia de derechos o responsabilidad alguna sobre los mismos, como tampoco respaldo, patrocinio o recomendación por parte del mismo.</p>
<p>Para realizar cualquier tipo de observación respecto a posibles incumplimientos de los derechos de propiedad intelectual o industrial, así como sobre cualquiera de los contenidos del sitio web, puede hacerlo a través del correo electrónico ${MAIL}</p>
<h2>3. Exención de responsabilidades</h2>
<p>El <strong>RESPONSABLE</strong> se exime de cualquier tipo de responsabilidad derivada de la información publicada en su sitio web siempre que no tenga conocimiento efectivo de que esta información haya sido manipulada o introducida por un tercero ajeno al mismo o, si lo tiene, haya actuado con diligencia para retirar los datos o hacer imposible el acceso a ellos.</p>
<h3>Uso de cookies</h3>
<p>Este sitio web puede utilizar <strong>cookies técnicas</strong> (pequeños archivos de información que el servidor envía al ordenador de quien accede a la página) imprescindibles para el correcto funcionamiento y visualización del sitio. Estas cookies tienen carácter temporal, con la única finalidad de hacer más eficaz la navegación, y desaparecen al terminar la sesión del usuario. En ningún caso proporcionan por sí mismas datos de carácter personal ni se utilizan para su recogida.</p>
<p>Este sitio web <strong>no utiliza cookies de analítica ni de publicidad</strong>, y no elabora perfiles de los usuarios a partir de sus hábitos de navegación. El único contenido de terceros que puede instalar cookies es el mapa de <strong>Google Maps</strong> incrustado en la sección de contacto. Para garantizar que no se instala ninguna cookie sin una acción voluntaria del usuario, dicho mapa <strong>no se carga de forma automática</strong>: únicamente se carga cuando el usuario pulsa expresamente sobre él para visualizarlo. En ese momento, Google podrá instalar sus propias cookies, sujetas a la ${GOOGLE_PRIV_ES}. Si el usuario no interactúa con el mapa, no se instala ninguna cookie de terceros.</p>
<p>El usuario tiene la posibilidad de configurar su navegador para ser alertado de la recepción de cookies y para impedir su instalación en su equipo. Por favor, consulte las instrucciones de su navegador para ampliar esta información.</p>
<h3>Política de enlaces</h3>
<p>Desde el sitio web, es posible que se redirija a contenidos de terceros sitios web. Dado que el <strong>RESPONSABLE</strong> no puede controlar siempre los contenidos introducidos por terceros en sus respectivos sitios web, no asume ningún tipo de responsabilidad respecto a dichos contenidos. En todo caso, procederá a la retirada inmediata de cualquier contenido que pudiera contravenir la legislación nacional o internacional, la moral o el orden público, procediendo a la retirada inmediata de la redirección a dicho sitio web, poniendo en conocimiento de las autoridades competentes el contenido en cuestión.</p>
<p>El <strong>RESPONSABLE</strong> no se hace responsable de la información y contenidos almacenados, a título enunciativo pero no limitativo, en foros, chats, generadores de blogs, comentarios, redes sociales o cualquier otro medio que permita a terceros publicar contenidos de forma independiente en la página web del <strong>RESPONSABLE</strong>. Sin embargo, y en cumplimiento de lo dispuesto en los artículos 11 y 16 de la LSSICE, se pone a disposición de todos los usuarios, autoridades y fuerzas de seguridad, colaborando de forma activa en la retirada o, en su caso, bloqueo de todos aquellos contenidos que puedan afectar o contravenir la legislación nacional o internacional, los derechos de terceros o la moral y el orden público. En caso de que el usuario considere que existe en el sitio web algún contenido que pudiera ser susceptible de esta clasificación, se ruega lo notifique de forma inmediata al administrador del sitio web.</p>
<p>Este sitio web se ha revisado y probado para que funcione correctamente. En principio, puede garantizarse el correcto funcionamiento los 365 días del año, 24 horas al día. Sin embargo, el <strong>RESPONSABLE</strong> no descarta la posibilidad de que existan ciertos errores de programación, o que acontezcan causas de fuerza mayor, catástrofes naturales, huelgas o circunstancias semejantes que hagan imposible el acceso a la página web.</p>
<h3>Direcciones IP</h3>
<p>Los servidores del sitio web podrán detectar de manera automática la dirección IP y el nombre de dominio utilizados por el usuario. Una dirección IP es un número asignado automáticamente a un ordenador cuando este se conecta a Internet. Toda esta información se registra en un fichero de actividad del servidor que permite el posterior procesamiento de los datos con el fin de obtener mediciones únicamente estadísticas que permitan conocer el número de impresiones de páginas, el número de visitas realizadas a los servidores web, el orden de visitas, el punto de acceso, etc.</p>
<h2>4. Ley aplicable y jurisdicción</h2>
<p>Para la resolución de todas las controversias o cuestiones relacionadas con el presente sitio web o de las actividades en él desarrolladas, será de aplicación la legislación española, a la que se someten expresamente las partes, siendo competentes para la resolución de todos los conflictos derivados o relacionados con su uso los Juzgados y Tribunales del domicilio del <strong>USUARIO</strong> o el lugar del cumplimiento de la obligación.</p>
`,
    politicaPrivacidad: `
<h1>Política de privacidad</h1>
<h2>1. Información al usuario</h2>
<h3>¿Quién es el responsable del tratamiento de tus datos personales?</h3>
<p><strong>Farmacia Lda. Gloria Torrents Grau</strong> es el <strong>RESPONSABLE</strong> del tratamiento de los datos personales del <strong>USUARIO</strong> y le informa de que estos datos serán tratados de conformidad con lo dispuesto en el Reglamento (UE) 2016/679, de 27 de abril (<strong>RGPD</strong>), y la Ley Orgánica 3/2018, de 5 de diciembre (<strong>LOPDGDD</strong>).</p>
<h3>¿Para qué y por qué tratamos tus datos personales?</h3>
<p>Este sitio web es informativo, no dispone de formularios de registro, consulta o similares ni de compra online. No obstante, podrían tratarse datos que el usuario nos facilite de forma voluntaria a través de cualquiera de las formas de contacto que se ponen a su disposición en la página web del <strong>RESPONSABLE</strong>. En ese caso, las operaciones de tratamiento serían las necesarias para tramitar encargos, solicitudes o dar respuesta a consultas o cualquier tipo de petición que sea realizada por el <strong>USUARIO</strong>, por interés legítimo del responsable (art. 6.1.f. RGPD).</p>
<p>Nunca enviaremos información comercial, y si decidiéramos hacerlo le solicitaríamos previamente su consentimiento (art. 6.1.a. RGPD).</p>
<h3>¿Durante cuánto tiempo guardaremos tus datos personales?</h3>
<p>Se conservarán durante no más tiempo del necesario para mantener el fin del tratamiento o existan prescripciones legales que dictaminen su custodia y cuando ya no sea necesario para ello, se suprimirán con medidas de seguridad adecuadas para garantizar la anonimización de los datos o la destrucción total de los mismos.</p>
<h3>¿A quién facilitamos tus datos personales?</h3>
<p>No está prevista ninguna comunicación de datos personales a terceros salvo, si fuese necesario para el desarrollo y ejecución de las finalidades del tratamiento, a nuestros proveedores de servicios relacionados con comunicaciones, con los cuales el <strong>RESPONSABLE</strong> tiene suscritos los contratos de confidencialidad y de encargado de tratamiento exigidos por la normativa vigente de privacidad.</p>
<h3>¿Cuáles son tus derechos?</h3>
<p>Los derechos que asisten al <strong>USUARIO</strong> son:</p>
<ul>
<li>Derecho a <strong>retirar el consentimiento</strong> en cualquier momento.</li>
<li>Derecho de <strong>acceso, rectificación, portabilidad y supresión</strong> de sus datos, y de <strong>limitación u oposición</strong> a su tratamiento.</li>
<li>Derecho a presentar una <strong>reclamación ante la autoridad de control</strong> (${AEPD}) si considera que el tratamiento no se ajusta a la normativa vigente.</li>
</ul>
<p><strong>Datos de contacto para ejercer sus derechos:</strong> Farmacia Lda. Gloria Torrents Grau. C/ De Roger de Flor, 166 - 08013 Barcelona. E-mail: ${MAIL}</p>
<h2>2. Carácter obligatorio o facultativo de la información facilitada por el usuario</h2>
<p>Este sitio web es meramente informativo y no dispone de formularios de registro, contacto o descarga que recojan datos personales. En caso de que el usuario decida ponerse en contacto de forma voluntaria con el <strong>RESPONSABLE</strong> a través de los medios facilitados (teléfono, correo electrónico o aplicaciones de mensajería), el suministro de sus datos será voluntario, si bien resultará necesario para poder atender su petición. El <strong>USUARIO</strong> garantiza que los datos personales facilitados al <strong>RESPONSABLE</strong> son veraces y se hace responsable de comunicar cualquier modificación de los mismos.</p>
<h2>3. Medidas de seguridad</h2>
<p>Que de conformidad con lo dispuesto en las normativas vigentes en protección de datos personales, el <strong>RESPONSABLE</strong> está cumpliendo con todas las disposiciones de las normativas <strong>RGPD</strong> y <strong>LOPDGDD</strong> para el tratamiento de los datos personales de su responsabilidad, y manifiestamente con los principios descritos en el artículo 5 del RGPD, por los cuales son tratados de manera lícita, leal y transparente en relación con el interesado y adecuados, pertinentes y limitados a lo necesario en relación con los fines para los que son tratados.</p>
<p>El <strong>RESPONSABLE</strong> garantiza que ha implementado políticas técnicas y organizativas apropiadas para aplicar las medidas de seguridad que establecen el RGPD y la LOPDGDD con el fin de proteger los derechos y libertades de los <strong>USUARIOS</strong> y les ha comunicado la información adecuada para que puedan ejercerlos.</p>
<p>Para más información sobre las garantías de privacidad, puedes dirigirte al <strong>RESPONSABLE</strong> a través de Farmacia Lda. Gloria Torrents Grau. C/ De Roger de Flor, 166 - 08013 Barcelona. E-mail: ${MAIL}</p>
`,
  },
  ca: {
    avisoLegal: `
<h1>Avís legal</h1>
<p><strong>Farmacia Lda. Gloria Torrents Grau</strong>, responsable del lloc web, en endavant <strong>RESPONSABLE</strong>, posa a disposició dels usuaris el present document, amb el qual pretén donar compliment a les obligacions disposades a la Llei 34/2002, d'11 de juliol, de Serveis de la Societat de la Informació i de Comerç Electrònic (LSSICE), BOE núm. 166, així com informar tots els usuaris del lloc web respecte a quines són les condicions d'ús.</p>
<p>Tota persona que accedeixi a aquest lloc web assumeix el paper d'usuari, comprometent-se a l'observança i compliment rigorós de les disposicions aquí disposades, així com a qualsevol altra disposició legal que fos aplicable.</p>
<p>Farmacia Lda. Gloria Torrents Grau es reserva el dret de modificar qualsevol tipus d'informació que pogués aparèixer al lloc web, sense que existeixi obligació de preavisar o posar en coneixement dels usuaris aquestes obligacions, entenent-se com a suficient la publicació al lloc web de Farmacia Lda. Gloria Torrents Grau.</p>
<h2>1. Dades identificatives</h2>
<ul>
<li><strong>Nom de domini:</strong> ${WEB}</li>
<li><strong>Nom comercial:</strong> Farmàcia Pediàtrica Torrents</li>
<li><strong>Denominació social:</strong> Farmacia Lda. Gloria Torrents Grau</li>
<li><strong>NIF:</strong> 77092934Q</li>
<li><strong>Domicili social:</strong> C/ De Roger de Flor, 166 - 08013 Barcelona</li>
<li><strong>Telèfon:</strong> 932461228</li>
<li><strong>E-mail:</strong> ${MAIL}</li>
</ul>
<h2>2. Drets de propietat intel·lectual i industrial</h2>
<p>El lloc web, incloent-hi a títol enunciatiu però no limitatiu la seva programació, edició, compilació i altres elements necessaris per al seu funcionament, els dissenys, logotips, text i/o gràfics, són propietat del <strong>RESPONSABLE</strong> o, si escau, disposa de llicència o autorització expressa per part dels autors. Tots els continguts del lloc web es troben degudament protegits per la normativa de propietat intel·lectual i industrial.</p>
<p>Independentment de la finalitat per a la qual fossin destinats, la reproducció total o parcial, ús, explotació, distribució i comercialització, requereix en tot cas l'autorització escrita prèvia per part del <strong>RESPONSABLE</strong>. Qualsevol ús no autoritzat prèviament es considera un incompliment greu dels drets de propietat intel·lectual o industrial de l'autor.</p>
<p>Els dissenys, logotips, text i/o gràfics aliens al <strong>RESPONSABLE</strong> i que poguessin aparèixer al lloc web, pertanyen als seus respectius propietaris, sent ells mateixos responsables de qualsevol possible controvèrsia que pogués suscitar-se respecte als mateixos. El <strong>RESPONSABLE</strong> autoritza expressament que tercers puguin redirigir directament als continguts concrets del lloc web, i en tot cas redirigir al lloc web principal de ${WEB}</p>
<p>El <strong>RESPONSABLE</strong> reconeix a favor dels seus titulars els corresponents drets de propietat intel·lectual i industrial, no implicant la seva sola menció o aparició al lloc web l'existència de drets o responsabilitat alguna sobre els mateixos, com tampoc suport, patrocini o recomanació per part del mateix.</p>
<p>Per realitzar qualsevol tipus d'observació respecte a possibles incompliments dels drets de propietat intel·lectual o industrial, així com sobre qualsevol dels continguts del lloc web, pot fer-ho a través del correu electrònic ${MAIL}</p>
<h2>3. Exempció de responsabilitats</h2>
<p>El <strong>RESPONSABLE</strong> s'eximeix de qualsevol tipus de responsabilitat derivada de la informació publicada al seu lloc web sempre que no tingui coneixement efectiu que aquesta informació hagi estat manipulada o introduïda per un tercer aliè al mateix o, si el té, hagi actuat amb diligència per retirar les dades o fer impossible l'accés a elles.</p>
<h3>Ús de galetes</h3>
<p>Aquest lloc web pot utilitzar <strong>galetes tècniques</strong> (petits arxius d'informació que el servidor envia a l'ordinador de qui accedeix a la pàgina) imprescindibles per al correcte funcionament i visualització del lloc. Aquestes galetes tenen caràcter temporal, amb l'única finalitat de fer més eficaç la navegació, i desapareixen en acabar la sessió de l'usuari. En cap cas proporcionen per si mateixes dades de caràcter personal ni s'utilitzen per a la seva recollida.</p>
<p>Aquest lloc web <strong>no utilitza galetes d'analítica ni de publicitat</strong>, i no elabora perfils dels usuaris a partir dels seus hàbits de navegació. L'únic contingut de tercers que pot instal·lar galetes és el mapa de <strong>Google Maps</strong> incrustat a la secció de contacte. Per garantir que no s'instal·la cap galeta sense una acció voluntària de l'usuari, aquest mapa <strong>no es carrega de forma automàtica</strong>: únicament es carrega quan l'usuari prem expressament sobre ell per visualitzar-lo. En aquest moment, Google podrà instal·lar les seves pròpies galetes, subjectes a la ${GOOGLE_PRIV_CA}. Si l'usuari no interactua amb el mapa, no s'instal·la cap galeta de tercers.</p>
<p>L'usuari té la possibilitat de configurar el seu navegador per ser alertat de la recepció de galetes i per impedir la seva instal·lació al seu equip. Si us plau, consulti les instruccions del seu navegador per ampliar aquesta informació.</p>
<h3>Política d'enllaços</h3>
<p>Des del lloc web, és possible que es redirigeixi a continguts de tercers llocs web. Atès que el <strong>RESPONSABLE</strong> no pot controlar sempre els continguts introduïts per tercers en els seus respectius llocs web, no assumeix cap tipus de responsabilitat respecte a aquests continguts. En tot cas, procedirà a la retirada immediata de qualsevol contingut que pogués contravenir la legislació nacional o internacional, la moral o l'ordre públic, procedint a la retirada immediata de la redirecció a aquest lloc web, posant en coneixement de les autoritats competents el contingut en qüestió.</p>
<p>El <strong>RESPONSABLE</strong> no es fa responsable de la informació i continguts emmagatzemats, a títol enunciatiu però no limitatiu, en fòrums, xats, generadors de blogs, comentaris, xarxes socials o qualsevol altre mitjà que permeti a tercers publicar continguts de forma independent a la pàgina web del <strong>RESPONSABLE</strong>. No obstant això, i en compliment del que disposen els articles 11 i 16 de la LSSICE, es posa a disposició de tots els usuaris, autoritats i forces de seguretat, col·laborant de forma activa en la retirada o, si escau, bloqueig de tots aquells continguts que puguin afectar o contravenir la legislació nacional o internacional, els drets de tercers o la moral i l'ordre públic. En cas que l'usuari consideri que existeix al lloc web algun contingut que pogués ser susceptible d'aquesta classificació, es prega ho notifiqui de forma immediata a l'administrador del lloc web.</p>
<p>Aquest lloc web s'ha revisat i provat perquè funcioni correctament. En principi, pot garantir-se el correcte funcionament els 365 dies de l'any, 24 hores al dia. No obstant això, el <strong>RESPONSABLE</strong> no descarta la possibilitat que existeixin certs errors de programació, o que esdevinguin causes de força major, catàstrofes naturals, vagues o circumstàncies semblants que facin impossible l'accés a la pàgina web.</p>
<h3>Adreces IP</h3>
<p>Els servidors del lloc web podran detectar de manera automàtica l'adreça IP i el nom de domini utilitzats per l'usuari. Una adreça IP és un número assignat automàticament a un ordinador quan aquest es connecta a Internet. Tota aquesta informació es registra en un fitxer d'activitat del servidor que permet el posterior processament de les dades amb la finalitat d'obtenir mesuraments únicament estadístics que permetin conèixer el nombre d'impressions de pàgines, el nombre de visites realitzades als servidors web, l'ordre de visites, el punt d'accés, etc.</p>
<h2>4. Llei aplicable i jurisdicció</h2>
<p>Per a la resolució de totes les controvèrsies o qüestions relacionades amb el present lloc web o de les activitats desenvolupades en ell, serà aplicable la legislació espanyola, a la qual se sotmeten expressament les parts, sent competents per a la resolució de tots els conflictes derivats o relacionats amb el seu ús els Jutjats i Tribunals del domicili de l'<strong>USUARI</strong> o el lloc del compliment de l'obligació.</p>
`,
    politicaPrivacidad: `
<h1>Política de privacitat</h1>
<h2>1. Informació a l'usuari</h2>
<h3>Qui és el responsable del tractament de les teves dades personals?</h3>
<p><strong>Farmacia Lda. Gloria Torrents Grau</strong> és el <strong>RESPONSABLE</strong> del tractament de les dades personals de l'<strong>USUARI</strong> i l'informa que aquestes dades seran tractades de conformitat amb el que disposa el Reglament (UE) 2016/679, de 27 d'abril (<strong>RGPD</strong>), i la Llei Orgànica 3/2018, de 5 de desembre (<strong>LOPDGDD</strong>).</p>
<h3>Per a què i per què tractem les teves dades personals?</h3>
<p>Aquest lloc web és informatiu, no disposa de formularis de registre, consulta o similars ni de compra en línia. No obstant això, podrien tractar-se dades que l'usuari ens faciliti de forma voluntària a través de qualsevol de les formes de contacte que es posen a la seva disposició a la pàgina web del <strong>RESPONSABLE</strong>. En aquest cas, les operacions de tractament serien les necessàries per tramitar encàrrecs, sol·licituds o donar resposta a consultes o qualsevol tipus de petició que sigui realitzada per l'<strong>USUARI</strong>, per interès legítim del responsable (art. 6.1.f. RGPD).</p>
<p>Mai enviarem informació comercial, i si decidíssim fer-ho li sol·licitaríem prèviament el seu consentiment (art. 6.1.a. RGPD).</p>
<h3>Durant quant de temps guardarem les teves dades personals?</h3>
<p>Es conservaran durant no més temps del necessari per mantenir la finalitat del tractament o existeixin prescripcions legals que dictaminin la seva custòdia i quan ja no sigui necessari per a això, se suprimiran amb mesures de seguretat adequades per garantir l'anonimització de les dades o la destrucció total de les mateixes.</p>
<h3>A qui facilitem les teves dades personals?</h3>
<p>No està prevista cap comunicació de dades personals a tercers excepte, si fos necessari per al desenvolupament i execució de les finalitats del tractament, als nostres proveïdors de serveis relacionats amb comunicacions, amb els quals el <strong>RESPONSABLE</strong> té subscrits els contractes de confidencialitat i d'encarregat de tractament exigits per la normativa vigent de privacitat.</p>
<h3>Quins són els teus drets?</h3>
<p>Els drets que assisteixen l'<strong>USUARI</strong> són:</p>
<ul>
<li>Dret a <strong>retirar el consentiment</strong> en qualsevol moment.</li>
<li>Dret d'<strong>accés, rectificació, portabilitat i supressió</strong> de les seves dades, i de <strong>limitació o oposició</strong> al seu tractament.</li>
<li>Dret a presentar una <strong>reclamació davant l'autoritat de control</strong> (${AEPD}) si considera que el tractament no s'ajusta a la normativa vigent.</li>
</ul>
<p><strong>Dades de contacte per exercir els seus drets:</strong> Farmacia Lda. Gloria Torrents Grau. C/ De Roger de Flor, 166 - 08013 Barcelona. E-mail: ${MAIL}</p>
<h2>2. Caràcter obligatori o facultatiu de la informació facilitada per l'usuari</h2>
<p>Aquest lloc web és merament informatiu i no disposa de formularis de registre, contacte o descàrrega que recullin dades personals. En cas que l'usuari decideixi posar-se en contacte de forma voluntària amb el <strong>RESPONSABLE</strong> a través dels mitjans facilitats (telèfon, correu electrònic o aplicacions de missatgeria), el subministrament de les seves dades serà voluntari, si bé resultarà necessari per poder atendre la seva petició. L'<strong>USUARI</strong> garanteix que les dades personals facilitades al <strong>RESPONSABLE</strong> són veraces i es fa responsable de comunicar qualsevol modificació de les mateixes.</p>
<h2>3. Mesures de seguretat</h2>
<p>Que de conformitat amb el que disposen les normatives vigents en protecció de dades personals, el <strong>RESPONSABLE</strong> està complint amb totes les disposicions de les normatives <strong>RGPD</strong> i <strong>LOPDGDD</strong> per al tractament de les dades personals de la seva responsabilitat, i manifestament amb els principis descrits a l'article 5 del RGPD, pels quals són tractats de manera lícita, lleial i transparent en relació amb l'interessat i adequats, pertinents i limitats al necessari en relació amb les finalitats per a les quals són tractats.</p>
<p>El <strong>RESPONSABLE</strong> garanteix que ha implementat polítiques tècniques i organitzatives apropiades per aplicar les mesures de seguretat que estableixen el RGPD i la LOPDGDD amb la finalitat de protegir els drets i llibertats dels <strong>USUARIS</strong> i els ha comunicat la informació adequada perquè puguin exercir-los.</p>
<p>Per a més informació sobre les garanties de privacitat, pots dirigir-te al <strong>RESPONSABLE</strong> a través de Farmacia Lda. Gloria Torrents Grau. C/ De Roger de Flor, 166 - 08013 Barcelona. E-mail: ${MAIL}</p>
`,
  },
  en: {
    avisoLegal: `
<h1>Legal notice</h1>
<p><strong>Farmacia Lda. Gloria Torrents Grau</strong>, owner of the website, hereinafter the <strong>CONTROLLER</strong>, makes this document available to users in order to comply with the obligations set out in Spanish Law 34/2002, of 11 July, on Information Society Services and Electronic Commerce (LSSICE), Official State Gazette No. 166, as well as to inform all website users of its terms of use.</p>
<p>Any person accessing this website assumes the role of user, undertaking to strictly observe and comply with the provisions set out herein, as well as any other applicable legal provision.</p>
<p>Farmacia Lda. Gloria Torrents Grau reserves the right to modify any information that may appear on the website, with no obligation to give prior notice or inform users of such changes; publication on the Farmacia Lda. Gloria Torrents Grau website shall be deemed sufficient.</p>
<h2>1. Identifying details</h2>
<ul>
<li><strong>Domain name:</strong> ${WEB}</li>
<li><strong>Trade name:</strong> Farmàcia Pediàtrica Torrents</li>
<li><strong>Company name:</strong> Farmacia Lda. Gloria Torrents Grau</li>
<li><strong>Tax ID (NIF):</strong> 77092934Q</li>
<li><strong>Registered address:</strong> C/ De Roger de Flor, 166 - 08013 Barcelona</li>
<li><strong>Phone:</strong> 932461228</li>
<li><strong>E-mail:</strong> ${MAIL}</li>
</ul>
<h2>2. Intellectual and industrial property rights</h2>
<p>The website, including but not limited to its programming, editing, compilation and other elements necessary for its operation, designs, logos, text and/or graphics, are the property of the <strong>CONTROLLER</strong> or, where applicable, it holds an express licence or authorisation from the authors. All website contents are duly protected by intellectual and industrial property regulations.</p>
<p>Regardless of the purpose for which they were intended, total or partial reproduction, use, exploitation, distribution and commercialisation require, in all cases, prior written authorisation from the <strong>CONTROLLER</strong>. Any unauthorised prior use is considered a serious infringement of the author's intellectual or industrial property rights.</p>
<p>Designs, logos, text and/or graphics not belonging to the <strong>CONTROLLER</strong> that may appear on the website belong to their respective owners, who are themselves responsible for any dispute that may arise in relation to them. The <strong>CONTROLLER</strong> expressly authorises third parties to redirect directly to specific website contents, and in any case to redirect to the main website at ${WEB}</p>
<p>The <strong>CONTROLLER</strong> acknowledges the corresponding intellectual and industrial property rights in favour of their holders; their mere mention or appearance on the website does not imply the existence of any rights or responsibility over them, nor any endorsement, sponsorship or recommendation.</p>
<p>To make any observation regarding possible infringements of intellectual or industrial property rights, or regarding any of the website contents, you may do so via the email address ${MAIL}</p>
<h2>3. Disclaimer of liability</h2>
<p>The <strong>CONTROLLER</strong> is exempt from any liability arising from the information published on its website, provided it has no actual knowledge that such information has been manipulated or introduced by a third party unrelated to it or, if it does, has acted diligently to remove the data or make access to it impossible.</p>
<h3>Use of cookies</h3>
<p>This website may use <strong>technical cookies</strong> (small information files that the server sends to the computer of whoever accesses the page) that are essential for the correct operation and display of the site. These cookies are temporary, with the sole purpose of making browsing more efficient, and disappear when the user's session ends. Under no circumstances do they themselves provide personal data, nor are they used to collect it.</p>
<p>This website <strong>does not use analytics or advertising cookies</strong>, and does not build user profiles based on browsing habits. The only third-party content that may install cookies is the <strong>Google Maps</strong> map embedded in the contact section. To ensure that no cookie is installed without a voluntary action by the user, this map <strong>does not load automatically</strong>: it only loads when the user expressly clicks on it to view it. At that point, Google may install its own cookies, subject to ${GOOGLE_PRIV_EN}. If the user does not interact with the map, no third-party cookie is installed.</p>
<p>Users may configure their browser to be alerted to the receipt of cookies and to prevent their installation on their device. Please consult your browser's instructions for more information.</p>
<h3>Links policy</h3>
<p>From the website, redirection to third-party website content may occur. Since the <strong>CONTROLLER</strong> cannot always control the content introduced by third parties on their respective websites, it assumes no liability for such content. In any case, it will proceed to immediately remove any content that may contravene national or international law, morality or public order, immediately removing the redirection to that website and informing the competent authorities of the content in question.</p>
<p>The <strong>CONTROLLER</strong> is not responsible for information and content stored, including but not limited to, in forums, chats, blog generators, comments, social networks or any other medium that allows third parties to publish content independently on the <strong>CONTROLLER</strong>'s website. However, in compliance with articles 11 and 16 of the LSSICE, it makes itself available to all users, authorities and security forces, actively collaborating in the removal or, where appropriate, blocking of any content that may affect or contravene national or international law, the rights of third parties, or morality and public order. Should the user consider that the website contains any content that could be subject to this classification, please notify the website administrator immediately.</p>
<p>This website has been reviewed and tested to work correctly. In principle, correct operation can be guaranteed 365 days a year, 24 hours a day. However, the <strong>CONTROLLER</strong> does not rule out the possibility of certain programming errors, or the occurrence of force majeure, natural disasters, strikes or similar circumstances that make access to the website impossible.</p>
<h3>IP addresses</h3>
<p>The website's servers may automatically detect the IP address and domain name used by the user. An IP address is a number automatically assigned to a computer when it connects to the Internet. All this information is recorded in a server activity file that allows the subsequent processing of the data in order to obtain solely statistical measurements such as the number of page impressions, the number of visits to the web servers, the order of visits, the access point, etc.</p>
<h2>4. Applicable law and jurisdiction</h2>
<p>For the resolution of all disputes or matters related to this website or the activities carried out on it, Spanish law shall apply, to which the parties expressly submit, with the Courts and Tribunals of the <strong>USER's</strong> domicile or the place of performance of the obligation being competent to resolve all conflicts arising from or related to its use.</p>
`,
    politicaPrivacidad: `
<h1>Privacy policy</h1>
<h2>1. Information for the user</h2>
<h3>Who is responsible for processing your personal data?</h3>
<p><strong>Farmacia Lda. Gloria Torrents Grau</strong> is the <strong>CONTROLLER</strong> of the processing of the <strong>USER's</strong> personal data and informs you that this data will be processed in accordance with Regulation (EU) 2016/679, of 27 April (<strong>GDPR</strong>), and Spanish Organic Law 3/2018, of 5 December (<strong>LOPDGDD</strong>).</p>
<h3>For what purpose and why do we process your personal data?</h3>
<p>This website is informational; it does not have registration, enquiry or similar forms, nor online purchasing. However, data that the user voluntarily provides through any of the contact methods made available on the <strong>CONTROLLER</strong>'s website may be processed. In that case, the processing operations would be those necessary to handle orders, requests or respond to enquiries or any type of request made by the <strong>USER</strong>, based on the legitimate interest of the controller (art. 6.1.f GDPR).</p>
<p>We will never send commercial information, and if we decide to do so we would request your consent beforehand (art. 6.1.a GDPR).</p>
<h3>How long will we keep your personal data?</h3>
<p>It will be kept for no longer than necessary to maintain the purpose of the processing or while legal provisions require its retention; when it is no longer needed, it will be deleted using appropriate security measures to guarantee the anonymisation of the data or its total destruction.</p>
<h3>Who do we share your personal data with?</h3>
<p>No disclosure of personal data to third parties is foreseen except, where necessary for the development and execution of the purposes of the processing, to our communications-related service providers, with whom the <strong>CONTROLLER</strong> has signed the confidentiality and data processor agreements required by current privacy regulations.</p>
<h3>What are your rights?</h3>
<p>The rights of the <strong>USER</strong> are:</p>
<ul>
<li>The right to <strong>withdraw consent</strong> at any time.</li>
<li>The right of <strong>access, rectification, portability and erasure</strong> of your data, and of <strong>restriction or objection</strong> to its processing.</li>
<li>The right to lodge a <strong>complaint with the supervisory authority</strong> (${AEPD}) if you consider that the processing does not comply with current regulations.</li>
</ul>
<p><strong>Contact details to exercise your rights:</strong> Farmacia Lda. Gloria Torrents Grau. C/ De Roger de Flor, 166 - 08013 Barcelona. E-mail: ${MAIL}</p>
<h2>2. Mandatory or optional nature of the information provided by the user</h2>
<p>This website is purely informational and does not have registration, contact or download forms that collect personal data. Should the user decide to contact the <strong>CONTROLLER</strong> voluntarily through the means provided (telephone, email or messaging applications), the provision of their data will be voluntary, although it will be necessary in order to handle their request. The <strong>USER</strong> guarantees that the personal data provided to the <strong>CONTROLLER</strong> is truthful and is responsible for communicating any changes to it.</p>
<h2>3. Security measures</h2>
<p>In accordance with the provisions of current personal data protection regulations, the <strong>CONTROLLER</strong> complies with all the provisions of the <strong>GDPR</strong> and <strong>LOPDGDD</strong> regulations for the processing of the personal data under its responsibility, and clearly with the principles described in article 5 of the GDPR, whereby data is processed lawfully, fairly and transparently in relation to the data subject, and is adequate, relevant and limited to what is necessary in relation to the purposes for which it is processed.</p>
<p>The <strong>CONTROLLER</strong> guarantees that it has implemented appropriate technical and organisational policies to apply the security measures established by the GDPR and the LOPDGDD in order to protect the rights and freedoms of <strong>USERS</strong> and has provided them with adequate information to exercise them.</p>
<p>For more information about privacy guarantees, you may contact the <strong>CONTROLLER</strong> at Farmacia Lda. Gloria Torrents Grau. C/ De Roger de Flor, 166 - 08013 Barcelona. E-mail: ${MAIL}</p>
`,
  },
};
