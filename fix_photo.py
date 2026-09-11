with open('src/views/ViewKasir.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = '{item.foto?<img src={item.foto} alt="" style={{width:26,height:26,borderRadius:4,objectFit:"cover",flexShrink:0}}/>:<div style={{width:26,height:26,background:"#e8f5ee",borderRadius:4,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:7,color:"#5a8a6a",fontWeight:600}}>YKK</span></div>}'

new = '<div style={{width:26,height:26,background:"#e8f5ee",borderRadius:4,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:7,color:"#5a8a6a",fontWeight:600}}>YKK</span></div>}'

if old in content:
    content = content.replace(old, new)
    with open('src/views/ViewKasir.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Replaced successfully!')
else:
    print('NOT FOUND - checking...')
    idx = content.find('item.foto')
    if idx >= 0:
        print('Found at index:', idx)
        print(repr(content[idx:idx+300]))