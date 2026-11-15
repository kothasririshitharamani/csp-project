import { DisasterType, Language } from "../types/app";

export interface DisasterGuide {
  id: DisasterType;
  title: Record<Language, string>;
  subtitle: Record<Language, string>;
  before: Record<Language, string[]>;
  during: Record<Language, string[]>;
  after: Record<Language, string[]>;
}

export const DISASTER_GUIDES: Record<DisasterType, DisasterGuide> = {
  cyclone: {
    id: "cyclone",
    title: {
      en: "Cyclone Preparedness",
      te: "తుఫాను సన్నద్ధత",
      hi: "चक्रवात (तूफान) तैयारी",
    },
    subtitle: {
      en: "Protect standing crops, irrigation motors, water sources, and farm records from high winds and heavy rain.",
      te: "బలమైన గాలులు మరియు భారీ వర్షాల నుండి పంటలు, మోటార్లు, నీటి వనరులు మరియు పత్రాలను కాపాడుకునే మార్గాలు.",
      hi: "तेज हवाओं और भारी बारिश से फसलों, सिंचाई मोटर, जल स्रोतों और दस्तावेजों की सुरक्षा के उपाय।",
    },
    before: {
      en: [
        "Harvest mature crops early (such as ripe paddy, chilli, or vegetables) and shift produce to high, dry storage.",
        "Clean field drainage channels and strengthen farm bunds so rainwater can drain quickly.",
        "Disconnect electric pump sets, cover borewell starters with waterproof sheets, and secure loose pipes/drip laterals.",
        "Provide bamboo or wooden propping/staking for tall or banana/vegetable crops where possible.",
        "Keep land records, Aadhaar, bank passbook, crop insurance documents, and essential dry rations in a waterproof pouch.",
      ],
      te: [
        "కోతకు వచ్చిన పంటలను (వరి, మిరప, కూరగాయలు వంటివి) ముందే కోసి ఎత్తైన, పొడి ప్రదేశంలో భద్రపరచండి.",
        "పొలంలో నీరు బయటకు పోయే డ్రైనేజీ కాలువలను శుభ్రం చేసి, గట్లను బలపరచండి.",
        "కరెంట్ మోటార్ల విద్యుత్ కనెక్షన్ తీసివేసి, స్టార్టర్లను వాటర్‌ప్రూఫ్ కవర్లతో కప్పండి; విడిగా ఉన్న పైపులు/డ్రిప్ లైన్లను కట్టి ఉంచండి.",
        "అరటి, కూరగాయల వంటి ఎత్తైన పంటలకు వీలైతే వెదురు/కర్రలతో ఆధారం ఇవ్వండి.",
        "భూమి పత్రాలు, ఆధార్, బ్యాంక్ పాస్‌బుక్, పంట బీమా కాగితాలు మరియు అత్యవసర వస్తువులను వాటర్‌ప్రూఫ్ కవర్లో ఉంచండి.",
      ],
      hi: [
        "पकी हुई फसलों (जैसे धान, मिर्च या सब्जियाँ) की समय से पहले कटाई करके ऊँचे व सूखे स्थान पर सुरक्षित रखें।",
        "खेत की जल निकासी नालियों को साफ करें और मेड़ों को मजबूत करें ताकि बारिश का पानी जल्दी निकल सके।",
        "बिजली की मोटर का कनेक्शन बंद करें, बोरवेल स्टार्टर को वाटरप्रूफ शीट से ढकें और खुले पाइप व ड्रिप लाइन बांधकर रखें।",
        "केला या ऊँची सब्जी फसलों को संभव हो तो बांस या लकड़ी का सहारा दें।",
        "जमीन के कागजात, आधार, बैंक पासबुक, फसल बीमा दस्तावेज और जरूरी सूखा राशन वाटरप्रूफ बैग में रखें।",
      ],
    },
    during: {
      en: [
        "Stay indoors in a safe pucca shelter; never enter flooded fields or touch wet electrical poles and pump starters.",
        "Move livestock to higher, covered ground and ensure clean drinking water is stored separately.",
        "Cover open wells and farm ponds if safe to do so beforehand to reduce mud and debris contamination.",
        "Strictly follow official evacuation and safety bulletins issued by district authorities and the India Meteorological Department (IMD).",
      ],
      te: [
        "సురక్షితమైన పక్కా భవనంలోనే ఉండండి; నీరు నిండిన పొలాల్లోకి వెళ్లకండి, తడిసిన కరెంట్ స్తంభాలు లేదా మోటార్ స్టార్టర్లను తాకకండి.",
        "పశువులను ఎత్తైన సురక్షిత ప్రదేశానికి తరలించి, శుభ్రమైన తాగునీరు సిద్ధంగా ఉంచండి.",
        "బావులు మరియు నీటి కుంటలలో బురద, చెత్త చేరకుండా ముందుగానే జాగ్రత్తలు తీసుకోండి.",
        "జిల్లా అధికారులు మరియు భారత వాతావరణ శాఖ (IMD) జారీ చేసే అధికారిక హెచ్చరికలను తప్పక పాటించండి.",
      ],
      hi: [
        "पक्के और सुरक्षित घर के अंदर रहें; जलमग्न खेतों में न जाएँ और गीले बिजली के खंभों या स्टार्टर को न छुएँ।",
        "पशुओं को ऊँचे और ढके हुए सुरक्षित स्थान पर रखें और साफ पीने का पानी अलग से संग्रहीत करें।",
        "खुले कुओं और तालाबों में कीचड़ व कचरा जाने से रोकने के लिए पहले से सावधानी रखें।",
        "जिला प्रशासन और भारतीय मौसम विभाग (IMD) द्वारा जारी आधिकारिक चेतावनियों का पूरी तरह पालन करें।",
      ],
    },
    after: {
      en: [
        "Open bund outlets immediately to drain standing rainwater from non-paddy crops within 24–48 hours.",
        "Wait for electrical wiring and pump motors to be inspected by an electrician before switching power back on.",
        "Do not use turbid or flood-contaminated pond water for domestic drinking or delicate seedling irrigation until settled/tested.",
        "Document crop and asset damage with clear date-stamped photos and report to your local RBK / Village Agriculture Assistant for assessment.",
        "Consult your Mandal Agricultural Officer before applying top-dress fertilizers or sprays to stressed crops.",
      ],
      te: [
        "వరి కాని పంటలలో నిలిచిన వర్షపు నీటిని 24–48 గంటల్లో బయటకు పంపడానికి గట్లకు గండి పెట్టండి.",
        "విద్యుత్ వైర్లు మరియు మోటార్లను ఎలక్ట్రీషియన్ తనిఖీ చేసిన తర్వాతే కరెంట్ ఆన్ చేయండి.",
        "వరద నీటితో కలుషితమైన బురద నీటిని శుభ్రం కాకుండా తాగునీటికి లేదా నారుమళ్లకు వాడకండి.",
        "పంట మరియు మోటారు నష్టాన్ని స్పష్టమైన ఫోటోలతో నమోదు చేసి, స్థానిక RBK / గ్రామ వ్యవసాయ సహాయకులకు తెలియజేయండి.",
        "దెబ్బతిన్న పంటలకు ఎరువులు లేదా మందులు వేసే ముందు మండల వ్యవసాయ అధికారి సలహా తీసుకోండి.",
      ],
      hi: [
        "धान के अलावा अन्य फसलों से 24–48 घंटों के भीतर रुका हुआ बारिश का पानी निकालने के लिए मेड़ खोलें।",
        "बिजली के तारों और मोटर पंप की इलेक्ट्रीशियन से जांच कराने के बाद ही बिजली चालू करें।",
        "बाढ़ से दूषित गंदे पानी का उपयोग पीने या नाजुक पौध की सिंचाई में न करें।",
        "फसल और उपकरण नुकसान की स्पष्ट फोटो लें और सर्वेक्षण के लिए स्थानीय कृषि सहायक या राजस्व कार्यालय में सूचित करें।",
        "तनावग्रस्त फसलों पर खाद या छिड़काव करने से पहले स्थानीय कृषि अधिकारी की सलाह लें।",
      ],
    },
  },
  flood: {
    id: "flood",
    title: {
      en: "Flood Preparedness",
      te: "వరద సన్నద్ధత",
      hi: "बाढ़ तैयारी",
    },
    subtitle: {
      en: "Reduce waterlogging damage, prevent pump/water contamination, and plan safe field recovery.",
      te: "పంటలు నీట మునగకుండా, నీటి వనరులు కలుషితం కాకుండా రక్షించుకునే మరియు పునరుద్ధరణ చర్యలు.",
      hi: "जलभराव से फसल नुकसान कम करने, जल स्रोतों को प्रदूषण से बचाने और सुरक्षित बहाली के उपाय।",
    },
    before: {
      en: [
        "Desilt drainage ditches and clear culverts around low-lying plots before peak monsoon inflows.",
        "Raise pump sets, fertilizer bags, seed stock, and farm tools onto raised platforms above previous flood marks.",
        "Check borewell casing caps and seal open well parapets to prevent dirty runoff from entering groundwater.",
        "Store important farm ownership, insurance, and identity documents in waterproof folders.",
      ],
      te: [
        "వర్షాకాలానికి ముందే పల్లపు పొలాల చుట్టూ ఉన్న డ్రైనేజీ కాలువలు మరియు కల్వర్టులలోని పూడికను తీయండి.",
        "మోటార్లు, ఎరువుల బస్తాలు, విత్తనాలు మరియు వ్యవసాయ పనిముట్లను వరద మట్టానికి ఎత్తులో ఉంచండి.",
        "వరద నీరు భూగర్భ జలాల్లోకి వెళ్లకుండా బోరు బావి మూతలు మరియు బావి గట్లను గట్టిగా మూసి ఉంచండి.",
        "పొలం పట్టాలు, బీమా మరియు గుర్తింపు పత్రాలను వాటర్‌ప్రూఫ్ ఫోల్డర్లలో భద్రపరచండి.",
      ],
      hi: [
        "मानसून के तेज बहाव से पहले निचले खेतों के आसपास नालियों और पुलियों से गाद व कचरा साफ करें।",
        "पंप सेट, खाद की बोरियां, बीज और खेती के औजारों को पिछले बाढ़ स्तर से ऊँचे चबूतरे पर रखें।",
        "बोरवेल के ढक्कन और खुले कुओं की मुंडेर की जांच करें ताकि गंदा पानी भूजल में न मिले।",
        "जमीन के मालिकाना हक, बीमा और पहचान पत्रों को वाटरप्रूफ फोल्डर में सुरक्षित रखें।",
      ],
    },
    during: {
      en: [
        "Never cross fast-moving floodwater on foot or by tractor; water depth and hidden pits are hazardous.",
        "Keep power to agricultural transformers and borewell starters switched off until water recedes.",
        "Avoid drinking or cooking with flood-affected open well water; use boiled or safe alternative water sources.",
        "Follow official alerts and evacuation routes announced by local revenue and disaster-response teams.",
      ],
      te: [
        "వేగంగా ప్రవహించే వరద నీటిలో నడవడం లేదా ట్రాక్టర్ నడపడం చేయకండి; లోతు మరియు గుంతలు ప్రమాదకరం.",
        "నీరు తగ్గే వరకు వ్యవసాయ ట్రాన్స్‌ఫార్మర్లు మరియు బోరు స్టార్టర్ల విద్యుత్ సరఫరాను ఆపివేయండి.",
        "వరద నీరు చేరిన బావుల నీటిని కాచి వడపోయకుండా తాగడానికి లేదా వంటకు వాడకండి.",
        "స్థానిక రెవెన్యూ మరియు విపత్తు నిర్వహణ బృందాల అధికారిక సూచనలను పాటించండి.",
      ],
      hi: [
        "तेज बहते बाढ़ के पानी को पैदल या ट्रैक्टर से पार न करें; पानी की गहराई और गड्ढे खतरनाक हो सकते हैं।",
        "पानी उतरने तक कृषि ट्रांसफार्मर और बोरवेल स्टार्टर की बिजली बंद रखें।",
        "बाढ़ प्रभावित खुले कुओं के पानी को बिना उबाले या साफ किए पीने व खाना बनाने में न इस्तेमाल करें।",
        "स्थानीय राजस्व और आपदा प्रबंधन दलों द्वारा बताए गए सुरक्षित मार्गों और चेतावनियों का पालन करें।",
      ],
    },
    after: {
      en: [
        "Drain stagnant water gradually; inspect soil surface for silt deposits or deep erosion gullies.",
        "Check crops for root rot, yellowing, or lodging once fields become walkable.",
        "Wash silt off leaves on young crops if feasible, and avoid heavy irrigation until topsoil regains aeration.",
        "Flush and disinfect contaminated wells according to local health/panchayat guidance before using water.",
        "Contact local Agriculture Officers for advice on short-duration replacement crops if primary crops suffered total loss.",
      ],
      te: [
        "నిలిచిన నీటిని క్రమంగా బయటకు పంపి, పొలంలో మేట వేసిన ఇసుక/ఒండ్రు లేదా కోతను పరిశీలించండి.",
        "పొలంలోకి నడవగలిగిన వెంటనే వేరు కుళ్లు, ఆకులు పసుపు రంగులోకి మారడం వంటి లక్షణాలను చూడండి.",
        "లేత పంట ఆకులపై ఉన్న బురదను వీలైతే శుభ్రం చేయండి; మట్టికి గాలి తగిలే వరకు మళ్లీ నీరు పెట్టకండి.",
        "కలుషితమైన బావులను స్థానిక పంచాయతీ/ఆరోగ్య శాఖ సూచనల మేరకు శుభ్రం చేసిన తర్వాతే వాడండి.",
        "పంట పూర్తిగా దెబ్బతింటే ప్రత్యామ్నాయ స్వల్పకాలిక పంటల కోసం వ్యవసాయ అధికారిని సంప్రదించండి.",
      ],
      hi: [
        "रुके हुए पानी को धीरे-धीरे बाहर निकालें; खेत की सतह पर जमा गाद या मिट्टी के कटाव की जांच करें।",
        "खेत में चलना सुरक्षित होने पर फसलों में जड़ सड़न, पीलापन या गिरने के लक्षण देखें।",
        "यदि संभव हो तो छोटे पौधों की पत्तियों से कीचड़ धोएँ और ऊपरी मिट्टी सूखकर हवादार होने तक सिंचाई न करें।",
        "प्रदूषित कुओं का पानी उपयोग करने से पहले स्थानीय पंचायत/स्वास्थ्य विभाग के निर्देशानुसार साफ व कीटाणुरहित करें।",
        "मुख्य फसल पूरी तरह नष्ट होने पर कम अवधि की वैकल्पिक फसलों के लिए कृषि अधिकारी से संपर्क करें।",
      ],
    },
  },
  drought: {
    id: "drought",
    title: {
      en: "Drought & Water Scarcity",
      te: "కరువు మరియు నీటి కొరత",
      hi: "सूखा और जल संकट",
    },
    subtitle: {
      en: "Stretch limited water, protect soil moisture, and prioritise critical crop stages.",
      te: "తక్కువ నీటిని పొదుపుగా వాడుతూ నేల తేమను కాపాడుకోవడం మరియు ముఖ్యమైన పంట దశలను రక్షించుకోవడం.",
      hi: "कम पानी का किफायती उपयोग कर मिट्टी की नमी बचाने और मुख्य फसल अवस्थाओं की रक्षा के उपाय।",
    },
    before: {
      en: [
        "Adopt drought-tolerant or short-duration crop varieties recommended for your district.",
        "Build farm bunds, contour trenches, or farm ponds to capture every spell of pre-monsoon and monsoon rain.",
        "Install or repair drip/sprinkler systems and fix leaking valves or conveyance channels.",
        "Incorporate farmyard manure or compost to boost the soil's natural water-holding capacity.",
      ],
      te: [
        "మీ జిల్లాకు అనువైన తక్కువ నీటితో పండే లేదా స్వల్పకాలిక పంట రకాలను ఎంచుకోండి.",
        "వర్షపు నీటిని నిల్వ చేయడానికి పొలం గట్లు, ఇంకుడు గుంతలు లేదా ఫార్మ్ పాండ్లను సిద్ధం చేయండి.",
        "డ్రిప్ లేదా స్ప్రింక్లర్ పైపుల లీకేజీలను ముందే మరమ్మతు చేయండి.",
        "నేల తేమను పట్టి ఉంచే సామర్థ్యాన్ని పెంచడానికి పశువుల ఎరువు లేదా కంపోస్టు వేయండి.",
      ],
      hi: [
        "अपने जिले के लिए अनुशंसित सूखा-सहिष्णु या कम अवधि की फसल किस्मों को चुनें।",
        "बारिश के हर दौर का पानी रोकने के लिए खेत की मेड़ें, ट्रेंच या फार्म तालाब तैयार रखें।",
        "ड्रिप या स्प्रिंकलर सिस्टम और नालियों के रिसाव की पहले से मरम्मत करें।",
        "मिट्टी की प्राकृतिक जल धारण क्षमता बढ़ाने के लिए गोबर की खाद या कम्पोस्ट मिलाएँ।",
      ],
    },
    during: {
      en: [
        "Irrigate strictly during early morning or evening hours to reduce evaporation loss.",
        "Apply dry straw, crop residue, or plastic mulching around plants to lock in soil moisture.",
        "Use alternate-furrow irrigation or skip lower-value plots so water reaches crops at flowering/grain-filling stages.",
        "Remove weeds promptly so they do not compete with crops for scarce moisture.",
        "Check borewell drawdown and avoid dry-running pumps; follow local groundwater sharing advisories.",
      ],
      te: [
        "ఆవిరి నష్టాన్ని తగ్గించడానికి ఉదయం లేదా సాయంత్రం చల్లని వేళల్లో మాత్రమే నీరు పెట్టండి.",
        "మొక్కల చుట్టూ ఎండు గడ్డి లేదా పంట వ్యర్థాలతో మల్చింగ్ చేసి నేల తేమను కాపాడండి.",
        "పూత మరియు గింజ పట్టే ముఖ్య దశలకు నీరు అందేలా ప్రత్యామ్నాయ సాళ్ల పద్ధతిని పాటించండి.",
        "కలుపు మొక్కలు నీటిని పీల్చుకోకుండా వెంటనే కలుపు తీయండి.",
        "బోరు మోటార్లు నీరు లేకుండా తిరగకుండా చూసి, స్థానిక నీటి పొదుపు సూచనలు పాటించండి.",
      ],
      hi: [
        "वाष्पीकरण से होने वाले नुकसान को कम करने के लिए केवल सुबह या शाम को सिंचाई करें।",
        "मिट्टी की नमी बचाने के लिए पौधों के चारों ओर सूखे पुआल या फसल अवशेष से मल्चिंग करें।",
        "फूल और दाना भरने की अवस्था के लिए पानी बचाने हेतु एकांतर नाली सिंचाई का उपयोग करें।",
        "खरपतवार को तुरंत हटाएँ ताकि वे सीमित नमी को न सोखें।",
        "बोरवेल के जल स्तर पर ध्यान दें और मोटर को सूखा न चलाएँ; स्थानीय जल साझाकरण सलाह का पालन करें।",
      ],
    },
    after: {
      en: [
        "Test soil moisture and assess plant recovery after the first relieving rains before applying fertilizers.",
        "Repair cracked bunds and desilt farm ponds so the next rainfall is harvested effectively.",
        "Plan crop rotation with pulses or green manure crops to rebuild soil organic matter and structure.",
        "Consult local Agriculture Officers or Krishi Vigyan Kendra (KVK) for moisture-conservation plans and relief eligibility.",
      ],
      te: [
        "మొదటి వర్షాలు పడిన తర్వాత నేల తేమ మరియు పంట కోలుకునే స్థితిని చూసి మాత్రమే ఎరువులు వేయండి.",
        "తదుపరి వర్షపు నీటిని నిల్వ చేయడానికి పగిలిన గట్లను సరిచేసి ఫార్మ్ పాండ్లలోని పూడిక తీయండి.",
        "నేల బలాన్ని పెంచడానికి పప్పుధాన్యాలు లేదా పచ్చిరొట్ట పంటలతో పంట మార్పిడి చేయండి.",
        "తేమ సంరక్షణ ప్రణాళికలు మరియు ప్రభుత్వ సహాయ వివరాల కోసం స్థానిక వ్యవసాయ అధికారి లేదా KVK నిపుణులను సంప్రదించండి.",
      ],
      hi: [
        "पहली राहत भरी बारिश के बाद खाद डालने से पहले मिट्टी की नमी और फसल की स्थिति की जांच करें।",
        "दरार पड़ी मेड़ों की मरम्मत करें और फार्म तालाब से गाद निकालें ताकि अगली बारिश का पानी जमा हो सके।",
        "मिट्टी में जैविक तत्व और संरचना सुधारने के लिए दलहन या हरी खाद वाली फसलों के साथ फसल चक्र अपनाएँ।",
        "नमी संरक्षण योजनाओं और राहत सहायता के लिए स्थानीय कृषि अधिकारी या कृषि विज्ञान केंद्र (KVK) से संपर्क करें।",
      ],
    },
  },
};
