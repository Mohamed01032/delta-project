

from flask import Flask, jsonify, request, render_template
import os
import torch
from report_generator import build_report, get_risk_level
from model_info import MODEL_METRICS
import torch.nn as nn
import torchvision.models as models
from torchvision.models import EfficientNet_B0_Weights
import cv2
import numpy as np
import albumentations as A
from albumentations.pytorch import ToTensorV2
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)


def get_model_with_unfreeze(num_classes=1, unfreeze_blocks=3):
    weights = EfficientNet_B0_Weights.IMAGENET1K_V1
    model = models.efficientnet_b0(weights=weights)
    
    for param in model.parameters():
        param.requires_grad = False
   
    stages = list(model.features.children())
    total_stages = len(stages)
    start_unfreeze = max(0, total_stages - unfreeze_blocks)
    for i in range(start_unfreeze, total_stages):
        for param in stages[i].parameters():
            param.requires_grad = True
    
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.5, inplace=True),
        nn.Linear(in_features, num_classes)
    )
    return model

IMG_SIZE = 224
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

val_transform = A.Compose([
    A.Resize(IMG_SIZE, IMG_SIZE),
    A.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ToTensorV2()
])


def predict_image(model, image_path, threshold=0.927, device='cuda'):
    """
    Loads and preprocesses a single image, runs inference, and returns prediction.
    
    Args:
        model: the trained PyTorch model (already loaded)
        image_path: path to the image file (PNG)
        threshold: decision threshold for Parkinson class (default 0.927)
        device: 'cuda' or 'cpu'
    
    Returns:
        dict with keys:
            'class': 'Normal' or 'Parkinson'
            'probability': probability of being Parkinson (float)
            'confidence': max probability (float)
    """
    
    img = cv2.imread(str(image_path))
    if img is None:
        raise ValueError(f"Could not load image: {image_path}")
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    
    transformed = val_transform(image=img)
    input_tensor = transformed["image"].unsqueeze(0).to(device)  # add batch dimension
    
   
    model.eval()
    with torch.no_grad():
        output = model(input_tensor)
        prob = torch.sigmoid(output).cpu().item()  # probability of Parkinson
    
   
    pred_class = "Parkinson" if prob >= threshold else "Normal"
    
    confidence = max(prob, 1 - prob)
    risk_level = get_risk_level(pred_class, prob)

    return {
        'class': pred_class,
        'probability': prob,
        'confidence': confidence,
        'risk_level': risk_level,
    }


device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = get_model_with_unfreeze(num_classes=1, unfreeze_blocks=3)
model_path = os.path.join(os.path.dirname(__file__), "model", "final_efficientnetb0_group_safe2.pth")

if os.path.exists(model_path):
    model.load_state_dict(torch.load(model_path, map_location=device))
else:
    print(f"Warning: Model file not found at {model_path}")
model.to(device)


@app.route('/')
@app.route('/index.html')
def index():
    return render_template('index.html', metrics=MODEL_METRICS)

@app.route('/about.html')
def about():
    return render_template('about.html')

@app.route('/how-it-works.html')
def how_it_works():
    return render_template('how-it-works.html')

@app.route('/report')
def report_page():
    pred_class = request.args.get('class', 'Normal')
    try:
        probability = float(request.args.get('probability', 0))
        confidence = float(request.args.get('confidence', 0))
    except ValueError:
        return jsonify({'error': 'Invalid parameters'}), 400

    image_url = request.args.get('image_url')
    filename = request.args.get('filename', '—')
    report = build_report(pred_class, probability, confidence, image_url, filename)
    return render_template('report.html', report=report)


@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            result = predict_image(model, filepath, threshold=0.927, device=device)
            image_url = f'/static/uploads/{filename}'
            report = build_report(
                pred_class=result['class'],
                probability=result['probability'],
                confidence=result['confidence'],
                image_url=image_url,
                filename=filename,
            )
            return jsonify({
                'success': True,
                'result': result,
                'report': report,
                'image_url': image_url,
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500



if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5000)