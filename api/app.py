from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import torch
import torchvision.transforms as transforms
from torchvision import models
from collections import OrderedDict
import io
import uvicorn # Needed to run FastAPI

# --- Initialize app ---
app = FastAPI(
    title="Plant Disease Classifier (FastAPI)",
    description="Upload an image and get plant disease prediction",
    version="1.0"
)

# Allow CORS (useful if connecting from a separate frontend application)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Define class names (Cleaned for better API response readability) ---
# This list MUST have 38 elements to match the model's output layer size
class_names = [
    "Apple Scab",
    "Apple Black Rot",
    "Apple Cedar Apple Rust",
    "Apple Healthy",
    "Blueberry Healthy",
    "Cherry (incl. sour) Healthy",
    "Cherry (incl. sour) Powdery Mildew",
    "Corn (Maize) Cercospora Leaf Spot / Gray Leaf Spot",
    "Corn (Maize) Common Rust",
    "Corn (Maize) Healthy",
    "Corn (Maize) Northern Leaf Blight",
    "Grape Black Rot",
    "Grape Esca (Black Measles)",
    "Grape Healthy",
    "Grape Leaf Blight (Isariopsis Leaf Spot)",
    "Orange Huanglongbing (Citrus Greening)",
    "Peach Bacterial Spot",
    "Peach Healthy",
    "Pepper Bell Bacterial Spot",
    "Pepper Bell Healthy",
    "Potato Early Blight",
    "Potato Healthy",
    "Potato Late Blight",
    "Raspberry Healthy",
    "Soybean Healthy",
    "Squash Powdery Mildew",
    "Strawberry Healthy",
    "Strawberry Leaf Scorch",
    "Tomato Bacterial Spot",
    "Tomato Early Blight",
    "Tomato Healthy",
    "Tomato Late Blight",
    "Tomato Leaf Mold",
    "Tomato Septoria Leaf Spot",
    "Tomato Spider Mites (Two-spotted)",
    "Tomato Target Spot",
    "Tomato Mosaic Virus",
    "Tomato Yellow Leaf Curl Virus"
]

num_classes = len(class_names)

# --- Load model ---
MODEL_PATH = "best_model.pth"
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# Load the ResNet50 model
model = models.resnet50(weights=None)
model.fc = torch.nn.Linear(model.fc.in_features, num_classes)

# Load your trained checkpoint
state_dict = torch.load(MODEL_PATH, map_location=device)
# Handle DataParallel prefix if necessary
new_state_dict = OrderedDict({k.replace("module.", ""): v for k, v in state_dict.items()})
model.load_state_dict(new_state_dict, strict=False) # strict=False is often safer when loading from DataParallel

# Move to device
model = model.to(device)
model.eval() # Set model to evaluation mode
print("Model loaded and ready!")

# --- Image preprocessing ---
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    # Added standard ImageNet normalization which is common for ResNet models
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
])

# --- API routes ---
@app.get("/")
def home():
    """Simple health check and info endpoint."""
    return {"message": "Plant Disease Classification API. Go to /docs for Swagger UI"}

@app.post("/predict/")
async def predict(file: UploadFile = File(...)):
    """
    Handles image upload, runs inference, and returns the predicted class and confidence.
    """
    try:
        # Read the uploaded file bytes asynchronously
        image_bytes = await file.read()
        # Open and convert image to RGB
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        return JSONResponse(content={"error": f"Cannot open or read image file: {e}"}, status_code=400)

    try:
        # Apply transformation and prepare tensor for the model
        img_tensor = transform(image).unsqueeze(0).to(device)  # add batch dim

        with torch.no_grad():
            outputs = model(img_tensor)
            
            # Calculate max prediction and confidence (softmax is required for confidence)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)[0]
            confidence, predicted_index = torch.max(probabilities, 0)
            
            class_name = class_names[predicted_index.item()]
            confidence_value = confidence.item()

        return {
            "filename": file.filename, 
            "disease": class_name, 
            "confidence": f"{confidence_value:.4f}"
        }
    except Exception as e:
        # Catch any errors during model inference or processing
        return JSONResponse(content={"error": f"Inference failed: {e}"}, status_code=500)

if __name__ == "__main__":
    # To run this file, use the command: uvicorn app:app --reload
    print(">>> FastAPI server configured to start on port 8000 (usually)")
    uvicorn.run(app, host="0.0.0.0", port=8000)
