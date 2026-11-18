"""גיבוי רשימות המילים מ-Supabase לקבצים במחשב.

הרצה:   python backup.py
תוצאה:  תיקייה backups/<תאריך של היום>/ ובה קובץ JSON לכל רשימה.

אפשר גם לבחור תיקייה אחרת:   python backup.py backups/latest
(כך GitHub מריץ את הסקריפט בגיבוי האוטומטי.)

הסקריפט משתמש רק בספרייה הסטנדרטית של פייתון, כך שאין צורך להתקין שום דבר.
"""

# --- ייבוא מודולים -----------------------------------------------------------
# מודול הוא קובץ קוד מוכן שמגיע עם פייתון. מייבאים רק את מה שצריך.
import json                      # המרה בין טקסט JSON לבין מבני נתונים של פייתון
import sys                       # גישה לפרמטרים של שורת הפקודה ולקוד היציאה
import urllib.request            # פנייה לכתובות אינטרנט
from datetime import date        # התאריך של היום
from pathlib import Path         # עבודה נוחה עם נתיבים של קבצים ותיקיות

# --- הגדרות ------------------------------------------------------------------
# משתנים באותיות גדולות הם מוסכמה ל"קבועים": ערכים שלא משתנים בזמן הריצה.
# אלה אותם כתובת ומפתח ציבורי שמופיעים ב-index.html.
SUPABASE_URL = "https://okeuenzucpidgqmdsueu.supabase.co"
SUPABASE_KEY = "sb_publishable_msl-qmlKE9CKABeByvVAQg_gJHZeDpT"
TABLE = "word_lists"
BACKUP_DIR = Path("backups")


def fetch_lists():
    """מושך את כל הרשימות מהענן ומחזיר אותן כרשימה של מילונים.

    כל מילון נראה כך: {"list_name": "אוכל", "words": [ {...}, {...} ]}
    """
    # f-string: מחרוזת שמתחילה ב-f ומאפשרת לשלב משתנים בתוך סוגריים מסולסלים.
    url = f"{SUPABASE_URL}/rest/v1/{TABLE}?select=list_name,words&order=list_name"

    # Supabase דורש שהמפתח יישלח ב"כותרות" (headers) של הבקשה.
    request = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    })

    # with דואג לסגור את החיבור בסוף הבלוק, גם אם קרתה שגיאה באמצע.
    with urllib.request.urlopen(request, timeout=30) as response:
        text = response.read().decode("utf-8")   # בייטים -> טקסט

    return json.loads(text)                       # טקסט JSON -> רשימה של מילונים


def safe_filename(name):
    """מחליף תווים שאסור להשתמש בהם בשמות קבצים ב-Windows."""
    forbidden = '\\/:*?"<>|'
    # "".join(...) מחבר רצף של תווים בחזרה למחרוזת אחת.
    # הביטוי שבסוגריים עובר על כל תו ומחליף תו אסור בקו תחתון.
    return "".join("_" if char in forbidden else char for char in name).strip()


def save_list(folder, list_name, words):
    """שומר רשימה אחת כקובץ JSON בתוך התיקייה ומחזיר את הנתיב של הקובץ."""
    path = folder / f"{safe_filename(list_name)}.json"   # האופרטור / מחבר נתיבים

    # ensure_ascii=False שומר עברית וערבית כאותיות קריאות ולא כקודים (א).
    # indent=2 מסדר את הקובץ בשורות מוזחות, כדי שיהיה נוח לקרוא אותו.
    text = json.dumps(words, ensure_ascii=False, indent=2)
    path.write_text(text, encoding="utf-8")
    return path


def main():
    print("מושך רשימות מהענן...")
    rows = fetch_lists()

    if not rows:                                  # רשימה ריקה נחשבת False
        print("לא נמצאו רשימות. אין מה לגבות.")
        return

    # sys.argv היא רשימת המילים שנכתבו בשורת הפקודה: [שם הסקריפט, פרמטר 1, ...]
    # אם ניתן פרמטר, הוא התיקייה לגיבוי. אחרת: תיקייה לפי התאריך של היום.
    if len(sys.argv) > 1:
        folder = Path(sys.argv[1])
    else:
        folder = BACKUP_DIR / date.today().isoformat()
    folder.mkdir(parents=True, exist_ok=True)     # יוצר אותה אם היא לא קיימת

    total_words = 0
    for row in rows:                              # לולאה על כל הרשימות
        name = row["list_name"]
        words = row["words"] or []                # אם הערך ריק (None), רשימה ריקה
        save_list(folder, name, words)
        total_words += len(words)
        print(f"  {name}: {len(words)} מילים")

    print(f"נשמרו {len(rows)} רשימות ({total_words} מילים) בתיקייה {folder}")


# הבלוק הזה רץ רק כשמריצים את הקובץ ישירות (python backup.py),
# ולא כשמייבאים אותו מקובץ אחר. זו הדרך המקובלת להתחיל תוכנית בפייתון.
if __name__ == "__main__":
    try:
        main()
    except OSError as error:
        # שגיאות רשת (אין אינטרנט, המסד מושהה) וגם שגיאות כתיבה לדיסק מגיעות לכאן.
        print(f"הגיבוי נכשל: {error}")
        sys.exit(1)   # קוד יציאה שונה מאפס מסמן "נכשל", וכך GitHub יודע שהריצה לא הצליחה
