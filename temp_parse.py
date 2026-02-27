import csv, pathlib, json
path=pathlib.Path(r'c:\Users\mdkam\Downloads\negotation.csv')
rows=[]
with open(path, newline='') as f:
    reader=csv.DictReader(f)
    for r in reader:
        rows.append(r)
print('count', len(rows))
print(rows[:2])
