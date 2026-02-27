import csv, json, pathlib
path=pathlib.Path(r'c:\Users\mdkam\Downloads\negotation.csv')
rows=[]
with open(path, newline='', encoding='utf-8') as f:
    reader=csv.DictReader(f)
    for r in reader:
        new = {}
        for k,v in r.items():
            clean = k.split('\n')[0].strip()
            if clean.lower().startswith('product id'):
                key='product_id'
            elif clean.lower().startswith('product name'):
                key='name'
            elif clean.lower().startswith('description'):
                key='description'
            elif clean.lower().startswith('price'):
                key='price'
            elif clean.lower().startswith('negotiable'):
                key='negotiable'
            elif clean.lower().startswith('discount'):
                key='discount'
            elif clean.lower().startswith('negotiated price'):
                key='negotiated_price'
            elif clean.lower().startswith('size'):
                key='size'
            elif clean.lower().startswith('category'):
                key='category'
            elif clean.lower().startswith('color'):
                key='color'
            elif clean.lower().startswith('material'):
                key='material'
            else:
                key=clean.replace(' ','_').lower()
            new[key]=v
        rows.append(new)
outfile=pathlib.Path(r'c:\Users\mdkam\Downloads\project\frontend\data\products.json')
outfile.parent.mkdir(exist_ok=True)
with open(outfile,'w',encoding='utf-8') as out:
    json.dump(rows,out,indent=2)
print('wrote', len(rows), 'items to', outfile)
