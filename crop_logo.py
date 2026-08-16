from PIL import Image

def crop_and_clean():
    img = Image.open('C:/Users/DHAIRYA GULATI/.gemini/antigravity-ide/brain/af547fd6-f8d3-4f0f-a292-63a46d0f34b4/media__1786873466087.png').convert("RGBA")
    
    # Exact box covering SM emblem, MANTRA®, SUCCESS, and tagline
    logo_crop = img.crop((68, 258, 306, 345))
    
    # Save cropped original
    logo_crop.save("d:/success/public/logo-cropped.png")
    
    # Generate clean transparent version
    datas = logo_crop.getdata()
    newData = []
    for item in datas:
        r, g, b, a = item
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        if lum < 18:
            newData.append((0, 0, 0, 0))
        elif lum < 40:
            alpha = int(((lum - 18) / 22.0) * 255)
            newData.append((r, g, b, alpha))
        else:
            newData.append((r, g, b, 255))
            
    transparent_img = Image.new("RGBA", logo_crop.size)
    transparent_img.putdata(newData)
    transparent_img.save("d:/success/public/logo-transparent.png")
    transparent_img.save("d:/success/public/logo.png")
    print("Perfect logo saved to logo.png!")

if __name__ == "__main__":
    crop_and_clean()
