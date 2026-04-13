export type VowelCategory = 'bigKing' | 'smallKing' | 'chataf' | 'none';
export type ShvaState = 'na' | 'nach' | 'none';
export type DageshState = 'kal' | 'chazak' | 'none';

export interface AnalyzedLetter {
  text: string;
  baseLetter: string;
  hasVowel: boolean;
  vowelName?: string;
  vowelCategory: VowelCategory;
  hasShva: boolean;
  shvaState: ShvaState;
  hasDagesh: boolean;
  dageshState: DageshState;
  isGuttural: boolean;
  isBgdKft: boolean;
  isShuruk: boolean;
  hasMappik: boolean;
  hasPatachGanuv: boolean;
  hasRaphe: boolean;
  hasGaya: boolean;
  isFinalForm: boolean;
  ruleExplanations: string[];
}

const Gutturals = ['א', 'ה', 'ח', 'ע'];
const BgdKft    = ['ב', 'ג', 'ד', 'כ', 'פ', 'ת'];
const FinalForms: Record<string, string> = {
  'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ',
};

function normalizeBase(letter: string): string {
  return FinalForms[letter] ?? letter;
}
function isGutturalLetter(letter: string): boolean {
  return Gutturals.includes(normalizeBase(letter));
}
function isBgdKftLetter(letter: string): boolean {
  return BgdKft.includes(normalizeBase(letter));
}

export function analyzeWord(word: string): AnalyzedLetter[] {
  const letters: AnalyzedLetter[] = [];
  let cur: AnalyzedLetter | null = null;

  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x05D0 && cp <= 0x05EA) {
      if (cur) letters.push(cur);
      cur = {
        text: ch, baseLetter: ch,
        hasVowel: false, vowelCategory: 'none',
        hasShva: false, shvaState: 'none',
        hasDagesh: false, dageshState: 'none',
        isGuttural: isGutturalLetter(ch),
        isBgdKft:   isBgdKftLetter(ch),
        isShuruk: false, hasMappik: false, hasPatachGanuv: false,
        hasRaphe: false, hasGaya: false,
        isFinalForm: ch in FinalForms,
        ruleExplanations: [],
      };
    } else if (cur) {
      cur.text += ch;
      switch (ch) {
        case '\u05BC': cur.hasDagesh = true; break;
        case '\u05BF': cur.hasRaphe  = true; break;
        case '\u05BD': cur.hasGaya   = true; break;
        case '\u05B0': cur.hasShva   = true; break;
        case '\u05B8': cur.hasVowel = true; cur.vowelCategory = 'bigKing';   cur.vowelName = 'קמץ';       break;
        case '\u05B5': cur.hasVowel = true; cur.vowelCategory = 'bigKing';   cur.vowelName = 'צירה';      break;
        case '\u05B9': cur.hasVowel = true; cur.vowelCategory = 'bigKing';   cur.vowelName = 'חולם';      break;
        case '\u05BA': cur.hasVowel = true; cur.vowelCategory = 'bigKing';   cur.vowelName = 'חולם חסר';  break;
        case '\u05B4': cur.hasVowel = true; cur.vowelCategory = 'bigKing';   cur.vowelName = 'חיריק';     break;
        case '\u05B7': cur.hasVowel = true; cur.vowelCategory = 'smallKing'; cur.vowelName = 'פתח';       break;
        case '\u05B6': cur.hasVowel = true; cur.vowelCategory = 'smallKing'; cur.vowelName = 'סגול';      break;
        case '\u05BB': cur.hasVowel = true; cur.vowelCategory = 'smallKing'; cur.vowelName = 'קובוץ';     break;
        case '\u05B1': cur.hasVowel = true; cur.vowelCategory = 'chataf';    cur.vowelName = 'חטף סגול';  break;
        case '\u05B2': cur.hasVowel = true; cur.vowelCategory = 'chataf';    cur.vowelName = 'חטף פתח';   break;
        case '\u05B3': cur.hasVowel = true; cur.vowelCategory = 'chataf';    cur.vowelName = 'חטף קמץ';   break;
      }
    }
  }
  if (cur) letters.push(cur);

  const last = letters.length - 1;

  // Phase 2: Shuruk, Mappik, Patach Ganuv
  for (let i = 0; i <= last; i++) {
    const l = letters[i];
    if (l.baseLetter === 'ו' && l.hasDagesh) {
      l.isShuruk = true; l.hasDagesh = false;
      l.hasVowel = true; l.vowelCategory = 'bigKing'; l.vowelName = 'שורוק';
      l.ruleExplanations.push('שורוק: וי"ו עם נקודה פנימית = תנועת "אוּ" ארוכה (מלך גדול). הנקודה אינה דגש — היא הציון של השורוק.');
    }
    if (l.baseLetter === 'ה' && l.hasDagesh && i === last) {
      l.hasMappik = true; l.hasDagesh = false;
      l.ruleExplanations.push('מפיק ה: הי"א בסוף מילה עם נקודה — הי"א נשמעת! (לדוגמה: בָּהּ = "בָּה" עם ה נשמעת). ללא נקודה הי"א שקטה.');
    }
    if (i === last && i > 0 && l.isGuttural && l.hasVowel && l.vowelName === 'פתח' && !l.hasMappik) {
      l.hasPatachGanuv = true;
      l.ruleExplanations.push('פתח גנובה (עדות המזרח): הגרוני "גונב" את הפתח ומזיזו לפניו. נקרא לפני הגרוני ולא אחריו! רוּחַ = "רוּ-אח", נֹחַ = "נוֹ-אח", שְׁמֵעַ = "שמֵ-עַ". שונה ממסורת אשכנז!');
    }
  }

  // Phase 3: Dagesh, Shva, extras
  for (let i = 0; i <= last; i++) {
    const l    = letters[i];
    const prev = i > 0    ? letters[i - 1] : null;
    const next = i < last ? letters[i + 1] : null;

    if (l.hasDagesh) {
      if (l.isGuttural) {
        l.dageshState = 'kal';
        l.ruleExplanations.push('⚠️ גרונית עם דגש: אות גרונית בדרך כלל אינה מקבלת דגש חזק. במקומו — התנועה שלפניה מתארכת (פיצוי).');
      } else if (l.isBgdKft) {
        const prevSilent = !prev || (prev.hasShva && prev.shvaState === 'nach') || (!prev.hasVowel && !prev.hasShva && !prev.isShuruk);
        if (prevSilent) {
          l.dageshState = 'kal';
          l.ruleExplanations.push('🛡️ דגש קל (המגן): לפניו שקט מוחלט (ראש מילה / שווא נח) — האות מתקשה. ב→B, פ→P, כ→K');
        } else {
          l.dageshState = 'chazak';
          l.ruleExplanations.push('🖨️ דגש חזק (מכונת הצילום): לפניו תנועה — המלך נותן מכה ומכפיל את האות!');
        }
      } else {
        l.dageshState = 'chazak';
        l.ruleExplanations.push('🖨️ דגש חזק: כל דגש באות שאינה בגדכפ"ת הוא חזק — מכפיל את האות.');
      }
    }

    if (l.hasRaphe && l.isBgdKft) {
      l.ruleExplanations.push('רפה: ' + l.baseLetter + ' נקראת בהגייה רכה (רפה = ההפך מדגש קל). ב→V, פ→F, כ→KH.');
    }
    if (l.hasGaya) {
      l.ruleExplanations.push('מתג (געיא): הטעמת עזר — מונעת שווא נח מוקדם ומשמרת את הברה המשנית.');
    }
    if (l.isGuttural && l.hasVowel && l.vowelCategory === 'chataf') {
      l.ruleExplanations.push('חטף (' + l.vowelName + '): גרוני נושא חטף — גרוניות מעדיפות תנועה מקוצרת על פני שווא נח. חטף = שווא + תנועה קטנה.');
    }
    if (l.isFinalForm) {
      const base = FinalForms[l.baseLetter] || l.baseLetter;
      l.ruleExplanations.push('אות סופית: ' + l.baseLetter + ' היא הצורת הסוף של ' + base + ' — מופיעה אך ורק בסוף מילה.');
    }
    if (l.baseLetter === 'ר' && l.hasDagesh) {
      l.ruleExplanations.push('הרי"ש: למחצה גרונית — בדרך כלל אינה מקבלת דגש. בדוק שמא דגש קל בלבד.');
    }

    if (l.hasShva) {
      if (i === 0) {
        l.shvaState = 'na';
        l.ruleExplanations.push('🏃 שווא נע — כלל א׳ (אליהו בחור): בראש מילה תמיד נע! אין מנוחה בהתחלה.');
      } else if (prev && prev.hasShva && prev.shvaState === 'nach') {
        l.shvaState = 'na';
        l.ruleExplanations.push('🏃 שווא נע — כלל ב׳: שני שוואים רצופים — ראשון נח, שני נע!');
      } else if (prev && prev.vowelCategory === 'bigKing') {
        l.shvaState = 'na';
        l.ruleExplanations.push('🏃 שווא נע — כלל ג׳: אחרי מלך גדול (תנועה ארוכה) — המלך משחרר לנוע.');
      } else if (l.dageshState === 'chazak') {
        l.shvaState = 'na';
        l.ruleExplanations.push('🏃 שווא נע — כלל ד׳: תחת דגש חזק — ראשון נח, שני (זה) נע.');
      } else if (next && normalizeBase(l.baseLetter) === normalizeBase(next.baseLetter)) {
        l.shvaState = 'na';
        l.ruleExplanations.push('🏃 שווא נע — כלל ה׳: אות כפולה (תאומות) — השווא מפריד ומונע מיזוג.');
      } else {
        l.shvaState = 'nach';
        l.ruleExplanations.push('🛑 שווא נח: שקט מוחלט — האות עוצרת בלא קול (בדרך כלל אחרי מלך קטן).');
      }
    }
  }

  return letters;
}
