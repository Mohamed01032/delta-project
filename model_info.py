MODEL_METRICS = {
    "accuracy": 96.79,
    "f1_score": 96.30,
    "precision": 94.20,
    "recall": 98.48,
    "roc_auc": 99.49,
    "threshold": 0.927,
}

DATASET_INFO = {
    "name": "Spiral Drawing Images (Normal vs Parkinson)",
    "total_rows": 831,
    "total_columns": 4,
    "columns": [
        {"name": "image_path", "desc": "مسار ملف صورة الرسم الحلزوني (PNG)"},
        {"name": "label_name", "desc": "اسم الفئة النصية: normal أو parkinson"},
        {"name": "label", "desc": "التصنيف الرقمي: 0 = طبيعي، 1 = شلل رعاش"},
        {"name": "group", "desc": "معرّف المجموعة/المريض لمنع تسريب البيانات بين التدريب والاختبار"},
    ],
    "classes": [
        {"name": "normal", "count": 610},
        {"name": "parkinson", "count": 221},
    ],
    "unique_groups": 18,
    "train_val_count": 675,
    "test_count": 156,
    "image_size": "224 × 224 بكسل",
    "format": "PNG",
}

MODEL_INFO = {
    "architecture": "EfficientNet-B0",
    "type": "Transfer Learning + Fine-Tuning",
    "pretrained": True,
    "pretrained_on": "ImageNet (IMAGENET1K_V1)",
    "custom_trained": True,
    "summary_ar": (
        "الموديل ليس جاهزًا للاستخدام مباشرة كما هو — بل مبني على EfficientNet-B0 "
        "المدرب مسبقًا على ImageNet، ثم تم تدريبه (Fine-Tuning) على بيانات مشروعنا "
        "لتمييز صور الرسم الحلزوني الطبيعية عن المصابة بالشلل الرعاش."
    ),
    "training_steps": [
        "تحميل EfficientNet-B0 بوزن ImageNet الجاهز (Pre-trained Backbone).",
        "تجميد كل طبقات الشبكة ثم فك تجميد آخر 3 Blocks فقط.",
        "استبدال طبقة التصنيف بـ Dropout + Linear لإخراج احتمال واحد.",
        "تدريب بـ BCEWithLogitsLoss مع pos_weight لموازنة الفئات.",
        "5-Fold Cross Validation لاختيار أفضل Threshold (0.927).",
        "تدريب نموذج نهائي على Train+Val وحفظه في final_efficientnetb0_group_safe2.pth.",
        "تقييم على Test Set الم hold-out (156 صورة) بدون تدريب عليها.",
    ],
    "optimizer": "Adam (lr=1e-4 للرأس، lr=1e-5 للـ Backbone)",
    "epochs": 30,
    "batch_size": 16,
}
