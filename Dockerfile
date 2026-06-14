# نستخدم نسخة slim لأنها أخف بكثير من النسخة العادية 
# ولا نستخدم alpine لأن المكتبات مثل PyTorch و OpenCV تحتاج لبيئة C++ للترجمة مما يزيد الحجم بشكل ضخم.
FROM python:3.10-slim

# إعداد منطقة العمل
WORKDIR /app

# نسخ ملف المتطلبات أولاً (للاستفادة من طبقات الكاش في Docker)
COPY requirements.txt .

# تثبيت الحزم بدون حفظ الملفات المؤقتة لتصغير مساحة الـ Image
RUN pip install --no-cache-dir -r requirements.txt

# نسخ باقي ملفات المشروع
COPY . .

# إنشاء مجلد الرفع وإعطاءه الصلاحيات
RUN mkdir -p /app/static/uploads && chmod 777 /app/static/uploads

# فتح المنفذ 5000
EXPOSE 5000

# تشغيل السيرفر
CMD ["python", "app.py"]