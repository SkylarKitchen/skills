// ---------------------------------------------------------------- F, the barn: a worked example of the format (never on the page); drawing agents copy its shape
{
  const rNL = y => 8 + 3.5*y/13.5;              // north lean-to over the stalls
  const rM  = y => 14 + 2.5*(y-13.5)/8.5;        // monitor over the north half of the aisle
  const rSL = y => 11 - 3.1*(y-22)/18.5;         // south lean-to, carried on over the porch
  const zF = (x,y) => y<13.5 ? rNL(y) : y<22 ? rM(y) : rSL(y);
  const ROT = 0, SUN = sunProfile(ROT);         // the house as it sits on the lot, and the noon sun in its section (DATA.md)
  OPT.F = {
    name:'The barn', no:'F', storeys:1, bed:'indoors',
    site:{rotation:ROT, at:[40,150]}, foundation:'slab',
    sub:`One compact volume under a barn roof: a tall centre aisle for kitchen, dining and living under a south-glazed monitor, low stalls on the north for the bedrooms, bath and pantry, and a lean-to porch the full length of the south side.`,
    plan:[`The north stalls are the thick wall against the winter wind; the aisle is one big room 16 ft wide, with the monitor (a raised roof with windows in its sides) over its north half rising to 16'-6"; the south lean-to is the porch. The stalls stop at 8'-10" with a glass band above them, so the bedrooms borrow the monitor's winter sun over their own partitions. The roof runs 8 ft past the west end to keep the woodpile and an outdoor kitchen dry.`],
    borrowed:[['The aisled barn (a traditional type)','a tall centre aisle under the ridge, with low lean-to aisles on either side'],
      ['The monitor-roof barn (a traditional type)','a raised roof over the middle with a band of windows in its sides'],
      ['Porch House (Lake|Flato)','the house as a big porch, here the lean-to']],
    pros:['One compact volume and one roof: little exterior wall for the floor area.','Everything is indoors: no outdoor crossings at all.','A porch 10 ft deep along the whole south side and around the woodpile, dry in any rain.'],
    cons:['The stalls have windows only on the north and at the ends, and borrow the rest of their light through the glass band.','Kitchen, dining and living share one room and the stalls open straight off it, so sound carries.','The monitor adds a second roof edge and two clerestory walls to build and flash.'],
    sectCap:`Section looking east through the main bedroom stall, the aisle and the porch. At noon on 21 December the sun comes through the monitor's south clerestory, crosses the aisle and clears the stall partitions through the glass band; in June the monitor's eave keeps it off the clerestory.`,
    view:{x0:-12, y0:-8.5, x1:57, y1:47.5},
    floors:[{r:[-8,30,48,40],k:'porch',dir:'y'},{r:[-8,0,0,30],k:'porch',dir:'x'}],
    stairs:[{r:[17.5,-3,22.5,0],dir:'N',n:4},{r:[20,40,28,43],dir:'S',n:4}],
    vols:[[0,0,48,30]],
    ward:[[8.333,11.333,12.8,13.333],[23.333,0.667,25.333,7.5]],
    parts:[[0.667,13.333,47.333,13.667],[8,0.667,8.333,13.333],[16,0.667,16.333,13.333],[23,0.667,23.333,13.333],[36,0.667,36.333,13.333]],
    open:[
      {v:0,w:'N',a:4,b:6.5,k:'win'},{v:0,w:'N',a:10,b:12.5,k:'win'},{v:0,w:'N',a:18.2,b:21.2,k:'door'},{v:0,w:'N',a:26,b:29.5,k:'win'},{v:0,w:'N',a:39.5,b:42.5,k:'win'},
      {v:0,w:'W',a:9,b:12,k:'door'},{v:0,w:'W',a:18,b:21.5,k:'win'},{v:0,w:'E',a:4,b:8,k:'win'},{v:0,w:'E',a:23,b:27,k:'win'},
      {v:0,w:'S',a:4,b:17,k:'glass'},{v:0,w:'S',a:17,b:23,k:'slide'},{v:0,w:'S',a:23,b:35,k:'glass'},{v:0,w:'S',a:35,b:41,k:'slide'},{v:0,w:'S',a:41,b:44,k:'glass'}],
    idoors:[{r:[3.5,13.333,6,13.667],d:-1},{r:[16,9.5,16.333,12.167],d:-1},{r:[17.5,13.333,22,13.667],k:'open'},
      {r:[24.5,13.333,27.167,13.667],d:-1},{r:[37.5,13.333,40.167,13.667],d:-1}],
    posts:[[8,22],[16,22],[24,22],[32,22],[40,22],
      [-7.6,39.6],[0,39.6],[8,39.6],[16,39.6],[32,39.6],[40,39.6],[47.6,39.6],[-7.6,0.4],[-7.6,8],[-7.6,16],[-7.6,24],[-7.6,32]],
    fx:[['wd',0.667,0.667,2.5,2.5],['wd',0.667,3.2,2.5,2.5],['tall',3.5,0.667,2.5,2.5],['shelf',6.5,0.667,1.5,9],
      ['tub',8.333,0.667,5,2.5],['wc',13.667,0.667,2.333,2.5,'N'],['counter',8.333,5.5,2,4],['basin',8.433,6.4,1.8,2.2],
      ['bench',16.333,3.8,1.5,5],['bed',30,0.667,5,6.667,'N'],['desk',38,0.667,6,2.25],['sofa',44.833,4,2.5,6.5,'E'],
      ['fridge',0.667,14,2.5,2.667],['counter',0.667,16.667,2.083,10.5],['sink',0.667,18.5,2.083,2.5],['dw',0.667,21,2.083,2],['range',0.667,23.5,2.083,2.5],
      ['counter',5.5,16.5,8,3],['table',17.5,24.5,6.5,3.2],
      ['hearth',44.8,16.5,2.533,4],['stove',45.3,17.5,1.5,2],['sofa',36,16.5,3,7,'W'],['chair',41,24.8,2.4,2.4],
      ['wood',-7,2,3,12],['counter',-7.5,17,2,8]],
    roofs:[[-8.5,-1.5, 49.5,-1.5, 49.5,40.5, -8.5,40.5]],
    monitor:[[-8.5,12.5, 49.5,12.5, 49.5,23.5, -8.5,23.5]],
    rooms:[['Pantry,|laundry',3.6,7.8],['Bath',12.6,6.8],['Mud,|entry',20.2,7.4],['Bedroom',30.5,10.2,160],['Studio|BR2',41,6.6,139],
      ['Kitchen',8,26],['Dining',20.2,21.3],['Living',31,26.5],['Porch, roofed',8,35,0,'paper']],
    notes:[['glass band above the stall front',11.8,14.6],['outdoor kitchen',-2.6,21,{rot:-Math.PI/2}]],
    dims:[[-8,0,0,0,-5.2],[0,0,48,0,-5.2],[48,0,48,13.5,3.6],[48,13.5,48,30,3.6],[48,30,48,40,3.6]],
    na:[53.5,36], sb:[0,44.5],
    sect:{view:{y0:-3,y1:45,z0:-4,z1:23.5}, items:[
      ['fill',[0.667,0, 29.333,0, 29.333,rSL(29.333), 22,rSL(22), 22,rM(22), 13.5,rM(13.5), 13.5,rNL(13.5), 0.667,rNL(0.667)]],
      ['ground',-3,45],
      ['beyond',box(0.667,0,7.333,2),true],['beyond',box(16.5,0,23.5,2.6),true],['beyond',box(21.8,0,22.2,9.9),true],['beyond',box(39.4,0,39.8,8.05),true],
      ['found',0,30],['cut',box(0,0,0.667,3)],['glass',0.333,3,7.2],['cut',box(0,7.2,0.667,8.1)],
      ['cut',box(13.333,0,13.667,8.833)],['glass',13.5,8.833,11.2],['cut',box(13.3,11.2,13.7,11.6)],['glass',13.5,11.6,13.4],['cut',box(13.333,13.4,13.667,14)],
      ['cut',[-1.5,rNL(-1.5), 13.5,rNL(13.5), 13.5,rNL(13.5)+0.8, -1.5,rNL(-1.5)+0.8]],
      ['cut',[12.5,rM(12.5), 23.5,rM(23.5), 23.5,rM(23.5)+0.8, 12.5,rM(12.5)+0.8]],
      ['cut',box(21.7,9.9,22.3,11)],['glass',22,11.9,16],['cut',box(21.833,16,22.167,16.5)],
      ['cut',[22,rSL(22), 40.5,rSL(40.5), 40.5,rSL(40.5)+0.8, 22,rSL(22)+0.8]],
      ['glass',29.667,0,9],['cut',box(29.333,9,30,9.8)],['found',30,40,'porch'],
      sunRay(22,15.85,SUN.dec,3.1,9.2,SUN.decLabel), sunRay(23.5,rM(23.5),SUN.jun,11.74,5,null,true), sunRay(40.5,rSL(40.5),SUN.jun,0,5,null,true),
      ['label',SUN.junLabel,24,21.9,{col:'pencil',align:'right',w:500}],
      ['label','Bedroom',7,4.8],['label','Living',26,4.3],['label','Porch',35,1.2],['label','Monitor',17.75,12.4]]},
    mass:[
      ...M.plinth(-8,0,48,40),
      M.deck(-8,30,48,40), M.deck(-8,0,0,30),
      M.wall([[0,22,11],[48,22,11],[48,22,16.5],[0,22,16.5]],'wallS',[[[0,22,11.9],[48,22,11.9],[48,22,16],[0,22,16]]]),
      M.wall([[0,30,0],[48,30,0],[48,30,9.66],[0,30,9.66]],'wallS',[[[4,30,0],[44,30,0],[44,30,9],[4,30,9]]]),
      M.wall([[0,0,0],[0,30,0],[0,30,9.66],[0,22,11],[0,22,16.5],[0,13.5,14],[0,13.5,11.5],[0,0,8]],'wallW',
        [[[0,9,0],[0,12,0],[0,12,7],[0,9,7]],[[0,18,3.5],[0,21.5,3.5],[0,21.5,7],[0,18,7]]]),
      ...M.posts([[-7.6,39.6],[0,39.6],[8,39.6],[16,39.6],[32,39.6],[40,39.6],[47.6,39.6],[-7.6,0.4],[-7.6,8],[-7.6,16],[-7.6,24],[-7.6,32]], zF),
      ...M.roof(-8.5,-1.5,49.5,13.5,rNL(-1.5),rNL(13.5)),
      ...M.roof(-8.5,12.5,49.5,23.5,rM(12.5),rM(23.5)),
      ...M.roof(-8.5,22,49.5,40.5,rSL(22),rSL(40.5))],
    // the diagrams (DATA.md): the one move coloured red, and the frames that build the form, the last being the massing itself
    key:[0,13.5,48,22],
    steps:[{says:'One compact box for every room', mass:[...M.gable({x0:0,y0:0,x1:48,y1:30,ze:8,zr:14})]},
      {says:'Low stalls on the north, a lean-to over the porch on the south', mass:[...M.shed({x0:0,y0:0,x1:48,y1:13.5,zn:8,zs:14,oN:1.5,oW:0.5,oE:0.5}),
        ...M.shed({x0:0,y0:13.5,x1:48,y1:30,zn:14,zs:9.66,oS:10.5,oW:0.5,oE:0.5}), M.deck(0,30,48,40)]}],
    // perim: 156 around the plan + the monitor's north and south walls above the two lean-to roofs, 2 x 48 = 96 (declared in rise) -> 252
    rise:[[0,13.5,48,22]],
    q:{platform:2240, footprint:1440, floorArea:1440, roofPlan:2436, perim:252, wallArea:1197, glass:723, porch:800, porchRoofed:800, cond:1338, baths:1, heads:3, stairs:0}
  };
  OPT.F.steps.push({says:'Raise a monitor over the aisle for the winter sun', mass:OPT.F.mass});
}
