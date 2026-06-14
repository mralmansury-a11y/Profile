# 🚀 Mohammed Rahel — Portfolio Website

منصة Portfolio شخصية متكاملة مبنية بـ Python Flask + SQLite

## 📁 هيكل المشروع

```
portfolio/
├── app.py                  # التطبيق الرئيسي
├── requirements.txt
├── instance/
│   └── portfolio.db        # قاعدة البيانات (تُنشأ تلقائياً)
├── static/
│   ├── css/style.css
│   └── js/main.js
└── templates/
    ├── base.html
    ├── index.html          # الصفحة الرئيسية
    ├── project_detail.html # تفاصيل المشروع
    ├── buy.html            # صفحة الشراء
    ├── order_success.html  # نجاح الطلب
    ├── admin.html          # لوحة التحكم
    └── admin_login.html    # تسجيل دخول الإدارة
```

## ⚡ تشغيل المشروع

```bash
# 1. ثبّت المتطلبات
pip install -r requirements.txt

# 2. شغّل التطبيق
python app.py

# 3. افتح المتصفح على
http://localhost:5000
```

## 🔐 لوحة التحكم

- الرابط: `http://localhost:5000/admin`
- كلمة المرور الافتراضية: `admin123`
- **غيّر كلمة المرور في app.py سطر: `ADMIN_PASS = 'admin123'`**

## ✨ المميزات

- 🎨 تصميم Dark Tech مميز مع تأثيرات Typing وانيميشن
- 📁 عرض المشاريع بكروت تفاعلية مع فلترة
- 💰 نظام بيع المشاريع بدفع كاش أو بطاقة أو تحويل
- 📩 نموذج تواصل يحفظ الرسائل في قاعدة البيانات
- 🛠️ لوحة تحكم كاملة لإدارة المشاريع والطلبات والرسائل
- 📱 متجاوب مع جميع الأجهزة
- 🌙 وضع داكن بالكامل

## 🎨 تخصيص المشاريع

في لوحة التحكم `/admin` يمكنك:
- إضافة/حذف مشاريع
- تغيير السعر وحالة البيع
- متابعة الطلبات وتغيير حالتها
- قراءة رسائل التواصل

## 📦 نشر على الإنترنت

للنشر على سيرفر (Render, Railway, VPS):

```bash
# أضف gunicorn
pip install gunicorn
gunicorn app:app
```

أو على Railway/Render: ارفع المجلد مباشرة وسيُنشأ تلقائياً.
