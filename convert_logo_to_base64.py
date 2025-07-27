import base64
import os

"""Convert the Fantasy League Chess logo to base64 for email embedding"""

def convert_logo_to_base64():
    
    logo_path = "fantasy-chess-frontend/public/avatars/fantasy-league-chess-logo.png"
    
    if not os.path.exists(logo_path):
        print(f"❌ Logo file not found at: {logo_path}")
        return None
    
    try:
        with open(logo_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            base64_data = f"data:image/png;base64,{encoded_string}"
            
            print("✅ Logo converted to base64 successfully!")
            print(f"📏 Base64 length: {len(encoded_string)} characters")
            
            # Save to a file for easy copying
            with open("logo_base64.txt", "w") as f:
                f.write(base64_data)
            
            print("💾 Base64 data saved to logo_base64.txt")
            print("📋 You can copy this into the email template")
            
            return base64_data
            
    except Exception as e:
        print(f"❌ Error converting logo: {str(e)}")
        return None

if __name__ == "__main__":
    print("🎨 Converting Fantasy League Chess Logo to Base64")
    print("=" * 50)
    
    base64_logo = convert_logo_to_base64()
    
    if base64_logo:
        print("\n✅ Success! The logo is ready for the email template.")
        print("📝 Copy the content from logo_base64.txt into the email template.")
    else:
        print("\n❌ Failed to convert logo. Please check the file path.") 