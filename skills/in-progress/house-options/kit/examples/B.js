// ---------------------------------------------------------------- B, the breezeway pair: a worked example of the format (never on the page)
{
  const zB = y => 16 + (10.2-16)*y/17.333;          // axon wall-top height, falls to the south
  const rB = y => 15.25 - 5.75*y/17.333;             // section: underside of roof
  const ROT = 0, SUN = sunProfile(ROT);              // the house as it sits on the lot, and the noon sun in its section
  OPT.B = {
    name:'Breezeway pair', no:'B', storeys:1, bed:'across the breezeway',
    site:{rotation:ROT, at:[40,150]}, foundation:'piers',
    sub:`Two pavilions one room deep under one 4:12 shed roof with a north clerestory, a 14 ft screened breezeway between them and an 8 ft deck along the south.`,
    plan:[`Living, kitchen and a service block of pantry, mud hall and bath in the west pavilion; a studio, a second bath with the laundry, and the main bedroom off a south gallery in the east pavilion. The breezeway between them is the summer room and the way to bed.`,
      `The roof is one plane, high on the north with a clerestory (a band of high windows) under it, low on the south over the deck, so every room gets winter sun from the south and summer air from both sides.`],
    borrowed:[['The breezeway house (a traditional type)','two rooms and an open passage under one roof, the passage as the summer room'],
      ['Marika-Alderton House (Glenn Murcutt, 1994)','rooms one deep along a verandah, with walls that open to the breeze'],
      ['Magney House (Glenn Murcutt, 1984)','a long, one-room-deep plan under a single roof plane']],
    pros:['Every room is one room deep, with air from both sides.','Living and sleeping are apart: a late night in the living room does not reach the bedroom.','One roof plane over the whole house, simple to frame and to drain.'],
    cons:['You cross the screened breezeway to get to bed, outdoors in winter.','Two full baths, because the house is split in two.','A long house, 95 ft end to end, so it needs the widest part of a lot.'],
    sectCap:`Section looking east through the kitchen, the living room and the deck. At noon on 21 December the sun passes the deck's roof edge and reaches the back of the kitchen; in June the same roof edge keeps it on the deck.`,
    view:{x0:-7, y0:-8, x1:102, y1:31},
    floors:[{r:[0,17.333,95.333,25.333],k:'deck'},{r:[34,0,48,17.333],k:'porch',dir:'y'}],
    stairs:[{r:[41,25.333,47,28.333],dir:'S',n:4}],
    vols:[[0,0,34,17.333],[48,0,95.333,17.333]],
    ward:[[48.667,10.667,63,12.667],[65.667,10.667,67.167,12.667],[77.333,0.667,79.333,6],[77.333,9,79.333,12.667]],
    parts:[[21.167,0.667,21.5,11.667],[25.5,0.667,25.833,11.667],[25.833,6.333,33.333,6.667],[21.167,11.667,33.333,12],
      [67.167,0.667,67.5,12.667],[67.5,12.333,77,12.667],[77,0.667,77.333,12.667],[77,12.667,77.333,16.666]],
    open:[
      {v:0,w:'S',a:4,b:19.118,k:'glass'},{v:0,w:'S',a:19.118,b:25.118,k:'slide'},{v:0,w:'S',a:25.118,b:30,k:'glass'},
      {v:1,w:'S',a:52,b:77,k:'glass'},{v:1,w:'S',a:77.333,b:85.882,k:'glass'},{v:1,w:'S',a:85.882,b:88.882,k:'door'},{v:1,w:'S',a:88.882,b:91.333,k:'glass'},
      {v:0,w:'N',a:10.833,b:14.833,k:'win'},{v:0,w:'N',a:27.5,b:30.5,k:'door'},
      {v:1,w:'N',a:51.75,b:54.25,k:'win'},{v:1,w:'N',a:61.083,b:63.583,k:'win'},{v:1,w:'N',a:70.167,b:73.167,k:'win'},
      {v:1,w:'N',a:79.75,b:82.25,k:'win'},{v:1,w:'N',a:89.083,b:91.583,k:'win'},
      {v:0,w:'E',a:1,b:4,k:'door'},{v:0,w:'E',a:13.333,b:16.333,k:'door',h:'b'},{v:1,w:'W',a:13.333,b:16.333,k:'door',h:'b'}],
    idoors:[{r:[21.167,3.25,21.5,5.75],d:1},{r:[25.5,1,25.833,3.5],d:-1},{r:[26.5,6.333,29,6.667],d:1},
      {r:[63,10.667,65.667,12.667],d:-1},{r:[69.5,12.333,72,12.667],d:-1},{r:[77,6,77.333,8.667],d:-1},{r:[77,13.333,77.333,16.333],d:1,h:'b'},
      {r:[42.5,0.2,45.5,0.466],d:1},{r:[42.5,16.867,45.5,17.133],d:-1}],
    screens:[[34,0.333,42.5,0.333],[45.5,0.333,48,0.333],[34,17,42.5,17],[45.5,17,48,17]],
    posts:[[41,0.333],[41,17]],
    fx:[['hearth',0.667,6.667,2,4],['stove',0.917,7.667,1.5,2],['counter',5,0.667,16.167,2.083],['range',12,0.667,2.5,2.083],['fridge',18.5,0.667,2.667,2.5],
      ['counter',7.5,6.25,7,2.5],['sink',9.5,6.25,2.5,2.5],['dw',12,6.25,2,2.5],['tall',23,9,2.5,2.5],['shelf',21.5,6.667,1,5],['shelf',24.5,4.333,1,4.333],
      ['bench',25.833,4.3,1.5,2],['shower',30.333,6.667,3,5],['wc',25.833,9,2.5,2.5,'W'],['basin',28.5,10,1.833,1.667],
      ['wd',67.5,0.667,2.5,2.5],['wd',70,0.667,2.5,2.5],['shower',67.5,4.5,5,5],['basin',73,4.5,2,1.667],['wc',74.5,10,2.5,2.333,'S'],
      ['shower',92,17.6,1.333,3],['wood',1,18,3,6],
      ['chair',3.6,6.9,2.3,2.3],['chair',3.6,9.4,2.3,2.3],['table',6.5,12.3,7,3],
      ['sofa',49.2,2.5,3,6.5,'W'],['desk',59.8,0.667,5,2.25],['bed',88,5.5,6.667,5,'E']],
    roofs:[[-2,-1.5, 97.333,-1.5, 97.333,20.833, -2,20.833]],
    rooms:[['Kitchen',16.3,4.5],['Living|dining',17.2,13.2],['Mud',30,5.1],['Bath',29.3,8.9],['Entry',27.3,14.3],
      ['Breezeway|screened',41,8.7,0,'paper'],['Studio|BR2',57.5,6.3,185],['Bath',73.6,8.3],['Gallery',63,14.7],['Bedroom',84.5,12.8,245],['Deck',60,21.3,0,'paper']],
    notes:[['Pantry',23.5,6.2,{rot:-Math.PI/2,size:9}]],
    dims:[[0,0,34,0,-3.2],[34,0,48,0,-3.2],[48,0,95.333,0,-3.2],[0,0,95.333,0,-5.8],[0,0,0,17.333,-3.6],[0,17.333,0,25.333,-3.6]],
    na:[99.5,21], sb:[0,28.5],
    sect:{view:{y0:-4,y1:34,z0:-3.5,z1:18.5}, items:[
      ['fill',[0.667,0, 16.666,0, 16.666,rB(16.666), 0.667,rB(0.667)]],
      ['ground',-4,34],
      ['beyond',box(0.667,0,2.75,3),true],['beyond',box(6.25,0,8.75,3),true],
      ['found',0,17.333],['found',17.333,25.333,'porch'],
      ['cut',box(0,0,0.667,11)],['cut',box(0,14.25,0.667,15.25)],['glass',0.333,11,14.25],
      ['cut',box(16.666,8.833,17.333,9.6)],['glass',17,0,8.833],
      ['cut',[-1.5,rB(-1.5), 20.833,rB(20.833), 20.833,rB(20.833)+0.8, -1.5,rB(-1.5)+0.8]],
      sunRay(20.833,rB(20.833),SUN.dec,0,6,SUN.decLabel), sunRay(20.833,rB(20.833),SUN.jun,0,5,SUN.junLabel,true),
      ['label','Kitchen',4.4,5.2],['label','Living',12.2,5.2],['label','Deck',21.3,1.2],['label','Clerestory',1.4,12.6,{align:'left'}]]},
    mass:[
      ...M.plinth(0,0,95.333,17.333),
      M.deck(0,17.333,95.333,25.333), M.deck(34,0,48,17.333,true),
      ...M.shed({x0:0,y0:0,x1:34,y1:17.333,zn:zB(0),zs:zB(17.333),noRoof:true,gS:[[4,19.118,0,8.833],[19.118,25.118,0,8.2],[25.118,30,0,8.833]]}),
      ...M.shed({x0:48,y0:0,x1:95.333,y1:17.333,zn:zB(0),zs:zB(17.333),noRoof:true,gS:[[52,77,0,8.833],[77.333,85.882,0,8.833],[85.882,88.882,0,7.5],[88.882,91.333,0,8.833]],gW:[[13.333,16.333,0,7]]}),
      ...M.posts([[41,0.333],[41,17]], (x,y)=>zB(y)),
      ...M.roof(-2,-1.5,97.333,20.833,zB(-1.5),zB(20.833))],
    // the diagrams (DATA.md): the one move coloured red, and the frames that build the form, the last being the massing itself
    key:{r:[34,0,48,17.333], name:'Breezeway', as:'room'},
    steps:[{says:'One bar, one room deep, long side to the sun', mass:[...M.shed({x0:0,y0:0,x1:95.333,y1:17.333,zn:zB(0),zs:zB(17.333)})]},
      {says:'Split it with an open breezeway between living and sleeping', mass:[...M.shed({x0:0,y0:0,x1:34,y1:17.333,zn:zB(0),zs:zB(17.333)}), ...M.shed({x0:48,y0:0,x1:95.333,y1:17.333,zn:zB(0),zs:zB(17.333)})]}],
    q:{platform:2415, footprint:1409.7, floorArea:1409.7, roofPlan:2218, perim:232, wallArea:1860, glass:1011, porch:1006, porchRoofed:243, cond:1259, baths:2, heads:3, stairs:0}
  };
  OPT.B.steps.push({says:'One roof over both, with a deck along the south', mass:OPT.B.mass});
}
