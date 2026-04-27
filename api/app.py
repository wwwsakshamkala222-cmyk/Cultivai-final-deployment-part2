from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import torch
import torchvision.transforms as transforms
from torchvision import models
import io
import os
import uvicorn

# --- Initialize app ---
app = FastAPI(
    title="Plant Disease Classifier",
    description="Upload an image and get plant disease prediction",
    version="2.0"
)

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Original class names from model training ---
classes_raw = [
    'Apple__Apple_scab', 'Apple_Black_rot', 'Apple_Cedar_apple_rust', 'Apple__healthy',
    'Blueberry__healthy', 'Cherry(including_sour)Powdery_mildew', 'Cherry(including_sour)_healthy',
    'Corn_(maize)Cercospora_leaf_spot Gray_leaf_spot', 'Corn(maize)Common_rust',
    'Corn_(maize)Northern_Leaf_Blight', 'Corn(maize)healthy', 'Grape__Black_rot',
    'Grape__Esca(Black_Measles)', 'Grape__Leaf_blight(Isariopsis_Leaf_Spot)', 'Grape___healthy',
    'Orange__Haunglongbing(Citrus_greening)', 'Peach__Bacterial_spot', 'Peach__healthy',
    'Pepper,bell_Bacterial_spot', 'Pepper,_bell_healthy', 'Potato__Early_blight',
    'Potato__Late_blight', 'Potato_healthy', 'Raspberry_healthy', 'Soybean__healthy',
    'Squash__Powdery_mildew', 'Strawberry_Leaf_scorch', 'Strawberry__healthy',
    'Tomato__Bacterial_spot', 'Tomato_Early_blight', 'Tomato_Late_blight', 'Tomato__Leaf_Mold',
    'Tomato__Septoria_leaf_spot', 'Tomato__Spider_mites Two-spotted_spider_mite',
    'Tomato__Target_Spot', 'Tomato_Tomato_Yellow_Leaf_Curl_Virus', 'Tomato__Tomato_mosaic_virus',
    'Tomato___healthy'
]

# ✅ MAPPING: Convert ugly names to human-readable names
def clean_class_name(raw_name):
    """Convert model class names to human-readable format"""
    mapping = {
        'Apple__Apple_scab': 'Apple Scab',
        'Apple_Black_rot': 'Apple Black Rot',
        'Apple_Cedar_apple_rust': 'Apple Cedar Apple Rust',
        'Apple__healthy': 'Apple Healthy',
        'Blueberry__healthy': 'Blueberry Healthy',
        'Cherry(including_sour)Powdery_mildew': 'Cherry (incl. sour) Powdery Mildew',
        'Cherry(including_sour)_healthy': 'Cherry (incl. sour) Healthy',
        'Corn_(maize)Cercospora_leaf_spot Gray_leaf_spot': 'Corn (Maize) Cercospora Leaf Spot / Gray Leaf Spot',
        'Corn(maize)Common_rust': 'Corn (Maize) Common Rust',
        'Corn_(maize)Northern_Leaf_Blight': 'Corn (Maize) Northern Leaf Blight',
        'Corn(maize)healthy': 'Corn (Maize) Healthy',
        'Grape__Black_rot': 'Grape Black Rot',
        'Grape__Esca(Black_Measles)': 'Grape Esca (Black Measles)',
        'Grape__Leaf_blight(Isariopsis_Leaf_Spot)': 'Grape Leaf Blight (Isariopsis Leaf Spot)',
        'Grape___healthy': 'Grape Healthy',
        'Orange__Haunglongbing(Citrus_greening)': 'Orange Huanglongbing (Citrus Greening)',
        'Peach__Bacterial_spot': 'Peach Bacterial Spot',
        'Peach__healthy': 'Peach Healthy',
        'Pepper,bell_Bacterial_spot': 'Pepper Bell Bacterial Spot',
        'Pepper,_bell_healthy': 'Pepper Bell Healthy',
        'Potato__Early_blight': 'Potato Early Blight',
        'Potato__Late_blight': 'Potato Late Blight',
        'Potato_healthy': 'Potato Healthy',
        'Raspberry_healthy': 'Raspberry Healthy',
        'Soybean__healthy': 'Soybean Healthy',
        'Squash__Powdery_mildew': 'Squash Powdery Mildew',
        'Strawberry_Leaf_scorch': 'Strawberry Leaf Scorch',
        'Strawberry__healthy': 'Strawberry Healthy',
        'Tomato__Bacterial_spot': 'Tomato Bacterial Spot',
        'Tomato_Early_blight': 'Tomato Early Blight',
        'Tomato_Late_blight': 'Tomato Late Blight',
        'Tomato__Leaf_Mold': 'Tomato Leaf Mold',
        'Tomato__Septoria_leaf_spot': 'Tomato Septoria Leaf Spot',
        'Tomato__Spider_mites Two-spotted_spider_mite': 'Tomato Spider Mites (Two-spotted)',
        'Tomato__Target_Spot': 'Tomato Target Spot',
        'Tomato_Tomato_Yellow_Leaf_Curl_Virus': 'Tomato Yellow Leaf Curl Virus',
        'Tomato__Tomato_mosaic_virus': 'Tomato Mosaic Virus',
        'Tomato___healthy': 'Tomato Healthy'
    }
    return mapping.get(raw_name, raw_name)

num_classes = len(classes_raw)

# --- Load model ---
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"🔧 Using device: {device}")

# Load the ResNet50 model
model = models.resnet50(weights=None)
model.fc = torch.nn.Linear(model.fc.in_features, num_classes)

# Load your trained checkpoint
checkpoint_path = "resnet50_final.pth"
print(f"📂 Loading model from: {checkpoint_path}")

try:
    state_dict = torch.load(checkpoint_path, map_location=device)
    # Handle DataParallel if needed
    new_state_dict = {k.replace("module.", ""): v for k, v in state_dict.items()}
    model.load_state_dict(new_state_dict)
    
    model = model.to(device)
    model.eval()
    print("✅ Model loaded and ready!")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    exit(1)

# --- Image preprocessing ---
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

# --- API routes ---
@app.get("/")
def home():
    return {
        "message": "Plant Disease Classification API",
        "model": checkpoint_path,
        "classes": num_classes,
        "status": "ready"
    }

@app.post("/predict/")
async def predict(file: UploadFile = File(...)):
    """
    Upload an image and get disease prediction with confidence score
    """
    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        return JSONResponse(
            content={"error": f"Cannot open image: {e}"}, 
            status_code=400
        )

    try:
        # Preprocess image
        img_tensor = transform(image).unsqueeze(0).to(device)

        # Run inference
        with torch.no_grad():
            outputs = model(img_tensor)
            
            # ✅ GET PROBABILITIES (for confidence)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)[0]
            
            # Get prediction
            confidence, predicted_index = torch.max(probabilities, 0)
            
            # Get raw class name
            raw_class_name = classes_raw[predicted_index.item()]
            
            # ✅ CONVERT to human-readable name
            clean_name = clean_class_name(raw_class_name)
            
            confidence_value = confidence.item()

        print(f"📊 Prediction: {clean_name} ({confidence_value*100:.2f}%)")

        # ✅ RETURN in format frontend expects
        return {
            "filename": file.filename,
            "disease": clean_name,  # ← Frontend expects "disease" not "prediction"
            "confidence": f"{confidence_value:.4f}"
        }
        
    except Exception as e:
        return JSONResponse(
            content={"error": f"Inference failed: {e}"}, 
            status_code=500
        )

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f">>> Starting FastAPI server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)