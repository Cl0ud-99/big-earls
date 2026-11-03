from PIL import Image
pairs = [
 ('shots/homepage/hero.png','docs/shots/hero.jpg'),
 ('shots/homepage/dusk.png','docs/shots/dusk.jpg'),
 ('shots/homepage/aerial2.png','docs/shots/aerial.jpg'),
 ('shots/homepage/sign.png','docs/shots/sign.jpg'),
 ('shots/homepage/service.png','docs/shots/service.jpg'),
 ('shots/homepage/pump.png','docs/shots/pump.jpg'),
]
for src,dst in pairs:
    im = Image.open(src).convert('RGB').resize((800,450), Image.LANCZOS)
    im.save(dst, 'JPEG', quality=88, optimize=True)
    print(dst, im.size)
