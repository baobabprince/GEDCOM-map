# GEDCOM Map Visualizer 🌍 genealogic Map Explorer

אפליקציה אינטראקטיבית ומתקדמת לניתוח והדמיית עצי משפחה (קבצי GEDCOM) על גבי מפת עולם אינטראקטיבית.  
המערכת מפענחת את כל המקומות, האירועים והאישים, מאתרת קואורדינטות גיאוגרפיות (גיאוקודינג), ומאפשרת לחקור את תולדות המשפחה בזמן ובמרחב.

---

## ✨ תכונות עיקריות (Features)

- 🗺️ **תצוגת מפה אינטראקטיבית:** הצגת כל המקומות ההיסטוריים, מקבצים (Clusters), מפת חום (Heatmap) ומסלולי הגירה ותנועה.
- 📅 **סינון כרונולוגי וציר זמן:** מחוון טווח שנים (Timeline Range Slider) לסינון אירועים לפי תקופות היסטוריות.
- ℹ️ **חלונית מידע מפורטת:** תצוגת אירועים לכל מיקום ממוינת כרונולוגית מהישן לחדש, עם כל האירועים ללא תאריך בסוף הרשימה.
- 👥 **תובנות דמוגרפיות (Demographic Insights):** גרפים ותרשימים אודות תוחלת חיים, גילאי נישואין, גילאי לידה ראשונה והתפלגויות דוריות.
- 📜 **הקשר היסטורי (Historical Context):** שילוב נתונים ואירועים היסטוריים עולמיים במקביל לאירועי המשפחה.
- ⚡ **מנוע גיאוקודינג מהיר במיוחד (High-Speed Geocoding):** מנוע רב-שכבתי הכולל מאגר פנימי מובנה של מאות ערים, מדינות ואזורים היסטוריים (זיהוי מיידי ב-0ms), עיבוד מקבילי (Parallel Worker Pool), אימות היררכי חכם ומטמון מקומי מתמיד.
- 📥 **ייצוא GEDCOM משודרג:** אפשרות הורדת קובץ GEDCOM מעודכן הכולל את הקואורדינטות הגיאוגרפיות המדויקות (`MAP` / `LATI` / `LONG`).
- 🚀 **פריסה אוטומטית:** מוגדר מראש עבור GitHub Actions לפריסה ישירה ל-GitHub Pages.

---

## 🛠️ טכנולוגיות (Tech Stack)

- **Frontend:** [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **עיצוב:** [Tailwind CSS v4](https://tailwindcss.com/)
- **מפות:** [Leaflet](https://leafletjs.com/), [React Leaflet](https://react-leaflet.js.org/), [Leaflet.heat](https://github.com/Leaflet/Leaflet.heat)
- **גרפים:** [Recharts](https://recharts.org/), [D3](https://d3js.org/)
- **אנימציות ואייקונים:** [Lucide Icons](https://lucide.dev/), [Motion](https://motion.dev/)

---

## 🚀 התקנה והרצה מקומית (Getting Started)

1. **שכפול המאגר:**
   ```bash
   git clone https://github.com/<your-username>/<repo-name>.git
   cd <repo-name>
   ```

2. **התקנת תלויות:**
   ```bash
   npm install
   ```

3. **הרצת שרת פיתוח:**
   ```bash
   npm run dev
   ```
   האפליקציה תהיה זמינה בדפדפן בכתובת: `http://localhost:3000` (או הכתובת המוצגת בטרמינל).

4. **בנייה לפרודקשן (Build):**
   ```bash
   npm run build
   ```

---

## 🌐 פריסה ל-GitHub Pages (Deployment)

הפרויקט כולל תהליך עבודה אוטומטי (`.github/workflows/deploy.yml`) המבצע Build ופריסה אוטומטית בכל Push לענף הראשי (`main`):

1. בהגדרות המאגר ב-GitHub: עברו אל **Settings** -> **Pages**.
2. תחת **Build and deployment** בחרו ב-Source: **GitHub Actions**.
3. בכל פעם שיועלה קוד חדש ל-`main`, האתר יתעדכן וייפרס אוטומטית.

ניתן גם לפרוס ידנית באמצעות:
```bash
npm run deploy
```

---

## 📄 רישיון (License)

פרויקט זה מופץ תחת רישיון קוד פתוח [MIT License](LICENSE).
זמין לשימוש חופשי, שינוי והפצה.
