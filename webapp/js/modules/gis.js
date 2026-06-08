// GIS 地圖模組 - 真實 KML 集水區邊界 + 衛星底圖 + AI 助理
let leafletMap = null;
let mapLayerGroups = {};
let watershedLayer = null;
let currentPhotoIndex = 0;
let currentPhotos = [];

// ===== 真實集水區邊界（KML 子集水區_972 解析，每3點取一點） =====
const WATERSHED_COORDS = [
  [24.25581,120.92986],[24.25573,120.92841],[24.25575,120.92741],[24.25538,120.92662],[24.25475,120.92539],[24.25421,120.92387],[24.25401,120.92282],[24.25365,120.92147],[24.25340,120.92077],[24.25306,120.92042],[24.25268,120.91941],[24.25216,120.91865],
  [24.25185,120.91749],[24.25134,120.91681],[24.25100,120.91654],[24.25056,120.91635],[24.25004,120.91617],[24.24963,120.91581],[24.24913,120.91541],[24.24879,120.91485],[24.24858,120.91454],[24.24826,120.91392],[24.24805,120.91348],[24.24784,120.91301],
  [24.24790,120.91155],[24.24767,120.91099],[24.24729,120.91039],[24.24658,120.91040],[24.24624,120.91008],[24.24590,120.90975],[24.24541,120.90930],[24.24508,120.90893],[24.24472,120.90855],[24.24423,120.90817],[24.24372,120.90789],[24.24330,120.90775],
  [24.24277,120.90760],[24.24237,120.90751],[24.24198,120.90742],[24.24129,120.90725],[24.24068,120.90703],[24.24012,120.90703],[24.23955,120.90652],[24.23900,120.90632],[24.23849,120.90617],[24.23801,120.90604],[24.23750,120.90584],[24.23698,120.90563],
  [24.23653,120.90541],[24.23582,120.90545],[24.23548,120.90452],[24.23515,120.90413],[24.23482,120.90391],[24.23451,120.90338],[24.23410,120.90220],[24.23374,120.90159],[24.23299,120.90123],[24.23252,120.90104],[24.23207,120.90092],[24.23159,120.90064],
  [24.23111,120.90076],[24.23076,120.90068],[24.23021,120.90046],[24.22982,120.90025],[24.22952,120.90006],[24.22914,120.89977],[24.22860,120.89940],[24.22818,120.89914],[24.22780,120.89895],[24.22730,120.89877],[24.22688,120.89865],[24.22644,120.89861],
  [24.22587,120.89871],[24.22545,120.89878],[24.22490,120.89886],[24.22438,120.89886],[24.22382,120.89887],[24.22327,120.89886],[24.22271,120.89876],[24.22232,120.89867],[24.22182,120.89848],[24.22122,120.89823],[24.22078,120.89802],[24.22021,120.89763],
  [24.21971,120.89741],[24.21921,120.89731],[24.21885,120.89734],[24.21843,120.89741],[24.21789,120.89758],[24.21732,120.89773],[24.21689,120.89774],[24.21636,120.89762],[24.21567,120.89745],[24.21511,120.89730],[24.21454,120.89729],[24.21413,120.89697],
  [24.21391,120.89646],[24.21344,120.89588],[24.21306,120.89567],[24.21243,120.89579],[24.21199,120.89573],[24.21151,120.89599],[24.21109,120.89627],[24.21066,120.89661],[24.21014,120.89688],[24.20960,120.89708],[24.20920,120.89720],[24.20881,120.89732],
  [24.20821,120.89759],[24.20777,120.89783],[24.20720,120.89787],[24.20675,120.89766],[24.20648,120.89727],[24.20622,120.89678],[24.20630,120.89582],[24.20593,120.89506],[24.20553,120.89443],[24.20549,120.89400],[24.20525,120.89354],[24.20501,120.89306],
  [24.20474,120.89263],[24.20405,120.89238],[24.20342,120.89234],[24.20311,120.89201],[24.20204,120.89192],[24.20140,120.89195],[24.20124,120.89244],[24.20074,120.89287],[24.20037,120.89322],[24.19993,120.89357],[24.19940,120.89448],[24.19906,120.89475],
  [24.19835,120.89431],[24.19794,120.89421],[24.19754,120.89411],[24.19709,120.89417],[24.19656,120.89454],[24.19613,120.89475],[24.19576,120.89471],[24.19539,120.89468],[24.19504,120.89508],[24.19467,120.89555],[24.19427,120.89597],[24.19374,120.89647],
  [24.19330,120.89688],[24.19312,120.89758],[24.19264,120.89774],[24.19217,120.89786],[24.19186,120.89810],[24.19134,120.89843],[24.19078,120.89879],[24.19037,120.89917],[24.19007,120.89954],[24.18969,120.90055],[24.18920,120.90011],[24.18881,120.90030],
  [24.18819,120.90038],[24.18771,120.90061],[24.18712,120.90084],[24.18667,120.90095],[24.18619,120.90105],[24.18553,120.90137],[24.18499,120.90150],[24.18430,120.90159],[24.18383,120.90164],[24.18336,120.90169],[24.18272,120.90192],[24.18229,120.90261],
  [24.18168,120.90265],[24.18101,120.90259],[24.18046,120.90215],[24.18008,120.90228],[24.17960,120.90245],[24.17907,120.90266],[24.17858,120.90332],[24.17802,120.90349],[24.17749,120.90354],[24.17696,120.90396],[24.17673,120.90436],[24.17658,120.90475],
  [24.17648,120.90531],[24.17599,120.90557],[24.17571,120.90614],[24.17554,120.90661],[24.17548,120.90712],[24.17546,120.90752],[24.17549,120.90818],[24.17554,120.90863],[24.17567,120.90941],[24.17575,120.90997],[24.17571,120.91043],[24.17564,120.91101],
  [24.17593,120.91151],[24.17634,120.91162],[24.17675,120.91145],[24.17713,120.91114],[24.17754,120.91075],[24.17789,120.91049],[24.17831,120.91019],[24.17892,120.90989],[24.17939,120.90983],[24.17989,120.90988],[24.18029,120.91001],[24.18073,120.91024],
  [24.18113,120.91053],[24.18145,120.91082],[24.18180,120.91121],[24.18229,120.91137],[24.18279,120.91123],[24.18321,120.91117],[24.18373,120.91120],[24.18414,120.91134],[24.18465,120.91145],[24.18525,120.91157],[24.18578,120.91154],[24.18625,120.91146],
  [24.18671,120.91133],[24.18714,120.91122],[24.18779,120.91106],[24.18833,120.91107],[24.18901,120.91114],[24.18967,120.91138],[24.19016,120.91195],[24.19056,120.91209],[24.19117,120.91231],[24.19162,120.91244],[24.19218,120.91268],[24.19249,120.91335],
  [24.19275,120.91378],[24.19285,120.91433],[24.19294,120.91491],[24.19325,120.91557],[24.19359,120.91585],[24.19397,120.91611],[24.19435,120.91644],[24.19475,120.91675],[24.19511,120.91709],[24.19576,120.91751],[24.19623,120.91771],[24.19675,120.91792],
  [24.19719,120.91809],[24.19761,120.91838],[24.19801,120.91864],[24.19853,120.91882],[24.19914,120.91889],[24.19960,120.91890],[24.20017,120.91886],[24.20065,120.91881],[24.20106,120.91876],[24.20151,120.91868],[24.20190,120.91860],[24.20241,120.91849],
  [24.20302,120.91845],[24.20351,120.91848],[24.20402,120.91858],[24.20451,120.91876],[24.20504,120.91885],[24.20558,120.91891],[24.20592,120.91902],[24.20631,120.91880],[24.20675,120.91945],[24.20714,120.91971],[24.20765,120.91980],[24.20794,120.92043],
  [24.20821,120.92081],[24.20845,120.92137],[24.20888,120.92152],[24.20938,120.92162],[24.20985,120.92172],[24.21039,120.92184],[24.21100,120.92201],[24.21146,120.92232],[24.21176,120.92255],[24.21219,120.92285],[24.21298,120.92333],[24.21354,120.92319],
  [24.21399,120.92398],[24.21440,120.92413],[24.21490,120.92435],[24.21538,120.92453],[24.21585,120.92470],[24.21635,120.92492],[24.21688,120.92511],[24.21751,120.92537],[24.21796,120.92550],[24.21835,120.92558],[24.21886,120.92541],[24.21929,120.92544],
  [24.21973,120.92559],[24.22015,120.92584],[24.22053,120.92610],[24.22094,120.92630],[24.22148,120.92649],[24.22196,120.92654],[24.22258,120.92659],[24.22306,120.92668],[24.22340,120.92698],[24.22369,120.92739],[24.22410,120.92776],[24.22452,120.92808],
  [24.22497,120.92832],[24.22542,120.92836],[24.22585,120.92831],[24.22633,120.92828],[24.22681,120.92838],[24.22710,120.92877],[24.22731,120.92923],[24.22760,120.92961],[24.22801,120.92998],[24.22848,120.93044],[24.22887,120.93086],[24.22912,120.93112],
  [24.22954,120.93153],[24.23018,120.93196],[24.23049,120.93270],[24.23029,120.93309],[24.23025,120.93355],[24.23008,120.93397],[24.22991,120.93447],[24.22979,120.93483],[24.22968,120.93524],[24.22959,120.93565],[24.22948,120.93633],[24.22942,120.93686],
  [24.22932,120.93730],[24.22918,120.93775],[24.22896,120.93832],[24.22879,120.93903],[24.22874,120.93972],[24.22899,120.94026],[24.22925,120.94067],[24.22950,120.94110],[24.22975,120.94154],[24.23003,120.94202],[24.23050,120.94265],[24.23046,120.94322],
  [24.23059,120.94374],[24.23084,120.94424],[24.23102,120.94492],[24.23143,120.94546],[24.23176,120.94594],[24.23202,120.94634],[24.23240,120.94679],[24.23298,120.94718],[24.23374,120.94793],[24.23377,120.94842],[24.23402,120.94896],[24.23416,120.94955],
  [24.23429,120.95015],[24.23448,120.95073],[24.23471,120.95140],[24.23526,120.95145],[24.23570,120.95166],[24.23606,120.95183],[24.23663,120.95205],[24.23702,120.95218],[24.23740,120.95231],[24.23775,120.95244],[24.23839,120.95274],[24.23889,120.95304],
  [24.23929,120.95349],[24.23973,120.95394],[24.24015,120.95418],[24.24048,120.95439],[24.24105,120.95500],[24.24159,120.95469],[24.24195,120.95446],[24.24226,120.95423],[24.24301,120.95393],[24.24308,120.95324],[24.24317,120.95273],[24.24317,120.95188],
  [24.24340,120.95155],[24.24389,120.95112],[24.24438,120.95066],[24.24459,120.95029],[24.24476,120.94984],[24.24506,120.94958],[24.24535,120.94908],[24.24518,120.94851],[24.24498,120.94803],[24.24498,120.94754],[24.24501,120.94716],[24.24500,120.94664],
  [24.24539,120.94630],[24.24559,120.94597],[24.24580,120.94567],[24.24597,120.94526],[24.24615,120.94476],[24.24638,120.94437],[24.24641,120.94388],[24.24678,120.94338],[24.24691,120.94301],[24.24747,120.94289],[24.24784,120.94268],[24.24821,120.94247],
  [24.24867,120.94242],[24.24905,120.94209],[24.24951,120.94172],[24.24977,120.94148],[24.25002,120.94120],[24.25029,120.94080],[24.25057,120.94035],[24.25079,120.93993],[24.25098,120.93951],[24.25111,120.93906],[24.25126,120.93867],[24.25172,120.93846],
  [24.25186,120.93802],[24.25205,120.93768],[24.25223,120.93727],[24.25234,120.93689],[24.25249,120.93639],[24.25262,120.93575],[24.25280,120.93536],[24.25296,120.93484],[24.25313,120.93414],[24.25340,120.93359],[24.25362,120.93312],[24.25389,120.93268],
  [24.25423,120.93240],[24.25457,120.93204],[24.25514,120.93144],[24.25539,120.93116],[24.25566,120.93070],[24.25584,120.93035],[24.25581,120.92986]
];


// ===== 里程節點（在河道上標示重要里程，座標對齊設施位置） =====
const STATION_MARKERS = [
  { lat:24.180055, lng:120.908622, km:'0K+460', color:'#1565c0' },
  { lat:24.180922, lng:120.908503, km:'0K+560', color:'#1565c0' },
  { lat:24.181672, lng:120.909300, km:'0K+740', color:'#1976d2' },
  { lat:24.183541, lng:120.909564, km:'1K+000', color:'#795548' },
  { lat:24.185158, lng:120.910163, km:'1K+225', color:'#0288d1' },
  { lat:24.186629, lng:120.909306, km:'1K+400', color:'#4527a0' }
];

// ===== 異常熱區（座標對齊實際設施 TWD97 換算位置） =====
const ANOMALY_ZONES = [
  { lat: 24.183541, lng: 120.909564, radius: 80, label: '溪構5-2 潛越式魚道損壞', color: '#b71c1c' },
  { lat: 24.180471, lng: 120.908621, radius: 65, label: '溪構11 階梯式固床工需維護', color: '#e65100' },
  { lat: 24.184805, lng: 120.909760, radius: 55, label: '溪構4 階段式魚道需維護', color: '#f57c00' }
];

// ===== 流速流量巡查點 =====
const SURVEY_POINTS = [
  { lat: 24.18232, lng: 120.90921, label: '樣站S4-107-108年魚類棲地調查', date: '2018-05-29' },
  { lat: 24.17602, lng: 120.90860, label: '水質監測站 0K+460', date: '2019-04-17' }
];

const HABITAT_MODEL_ZONES = [
  {
    id: 'HM-I',
    name: '第 I 區河川棲地二維模式',
    station: '0K+460 - 0K+560',
    structure: '0K+460、0K+560 防砂壩',
    area: 15122.75,
    center: [24.18048, 120.90856],
    color: '#2563eb',
    coords: [[24.17994,120.90836],[24.18010,120.90884],[24.18090,120.90878],[24.18104,120.90842],[24.18042,120.90828]],
    species: [
      ['臺灣石魚賓', '2.200%', '332.65'], ['臺灣白甲魚', '1.802%', '272.43'],
      ['臺灣間爬岩鰍', '1.728%', '261.27'], ['纓口臺鰍', '6.387%', '965.93'],
      ['明潭吻鰕虎', '3.357%', '507.74'], ['短臀瘋鱨', '2.428%', '367.23']
    ]
  },
  {
    id: 'HM-II',
    name: '第 II 區河川棲地二維模式',
    station: '0K+740',
    structure: '0K+740 階梯式魚道',
    area: 10658.05,
    center: [24.18167, 120.90930],
    color: '#06b6d4',
    coords: [[24.18135,120.90884],[24.18158,120.90934],[24.18188,120.90978],[24.18214,120.90958],[24.18190,120.90906],[24.18155,120.90874]],
    species: [
      ['臺灣石魚賓', '5.30%', '565.321'], ['臺灣白甲魚', '2.64%', '281.549'],
      ['臺灣間爬岩鰍', '2.12%', '226.074'], ['纓口臺鰍', '6.22%', '663.449'],
      ['明潭吻鰕虎', '6.11%', '651.461'], ['短臀瘋鱨', '1.21%', '129.152']
    ]
  },
  {
    id: 'HM-III',
    name: '第 III 區河川棲地二維模式',
    station: '1K+000',
    structure: '1K+000 階梯式魚道',
    area: 13364.68,
    center: [24.18371, 120.90952],
    color: '#22c55e',
    coords: [[24.18328,120.90917],[24.18363,120.90990],[24.18408,120.90978],[24.18412,120.90934],[24.18365,120.90910]],
    species: [
      ['臺灣石魚賓', '3.493%', '466.79'], ['臺灣白甲魚', '2.54%', '339.62'],
      ['臺灣間爬岩鰍', '2.67%', '357.06'], ['纓口臺鰍', '9.37%', '1252.73'],
      ['明潭吻鰕虎', '4.70%', '629.37'], ['短臀瘋鱨', '1.628%', '217.64']
    ]
  },
  {
    id: 'HM-IV',
    name: '第 IV 區河川棲地二維模式',
    station: '1K+170 - 1K+225',
    structure: '1K+170 階梯式魚道、1K+225 固床工',
    area: 13326.51,
    center: [24.18498, 120.90996],
    color: '#f59e0b',
    coords: [[24.18455,120.90950],[24.18498,120.91034],[24.18538,120.91021],[24.18532,120.90970],[24.18488,120.90936]],
    species: [
      ['臺灣石魚賓', '3.60%', '479.38'], ['臺灣白甲魚', '2.66%', '354.52'],
      ['臺灣間爬岩鰍', '1.80%', '240.95'], ['纓口臺鰍', '4.68%', '623.06'],
      ['明潭吻鰕虎', '5.11%', '680.28'], ['短臀瘋鱨', '1.19%', '158.10']
    ]
  },
  {
    id: 'HM-V',
    name: '第 V 區河川棲地二維模式',
    station: '1K+315 - 1K+400',
    structure: '1K+315 階梯式魚道、1K+400 粗石斜曲面及改良型舟通式魚道',
    area: 15776.91,
    center: [24.18620, 120.90938],
    color: '#ef4444',
    coords: [[24.18572,120.90906],[24.18610,120.90970],[24.18676,120.90972],[24.18695,120.90930],[24.18640,120.90896]],
    species: [
      ['臺灣石魚賓', '4.337%', '684.30'], ['臺灣白甲魚', '2.992%', '472.04'],
      ['臺灣間爬岩鰍', '2.640%', '416.51'], ['纓口臺鰍', '5.046%', '796.03'],
      ['明潭吻鰕虎', '4.787%', '755.25'], ['短臀瘋鱨', '1.11%', '174.80']
    ]
  }
];

function renderGIS() {
  document.getElementById('contentArea').innerHTML = `
    <div class="gis-topbar">
      <div class="gis-section-label">三、數位化與 AI 智慧分析作業</div>
      <div class="gis-title-row">
        <h2 class="gis-main-title">GIS 圖台與異常熱區展示</h2>
        <div class="gis-layer-toggles">
          <label class="gis-toggle"><input type="checkbox" id="lyrWatershed" checked onchange="toggleGisLayer('watershed')"><span>集水區範圍</span></label>
          <label class="gis-toggle"><input type="checkbox" id="lyrFacilities" checked onchange="toggleGisLayer('facilities')"><span>工程設施</span></label>
          <label class="gis-toggle"><input type="checkbox" id="lyrHabitat" checked onchange="toggleGisLayer('habitat')"><span>生態棲地</span></label>
          <label class="gis-toggle"><input type="checkbox" id="lyrHabitatModel" checked onchange="toggleGisLayer('habitatModel')"><span>棲地二維模式</span></label>
          <label class="gis-toggle"><input type="checkbox" id="lyrInspection" checked onchange="toggleGisLayer('inspection')"><span>巡查成果</span></label>
          <label class="gis-toggle"><input type="checkbox" id="lyrAnomaly" checked onchange="toggleGisLayer('anomaly')"><span>異常熱區</span></label>
          <label class="gis-toggle"><input type="checkbox" id="lyrRoads" onchange="toggleGisLayer('roads')"><span>道路路網</span></label>
          <label class="gis-toggle"><input type="checkbox" id="lyrTownship" onchange="toggleGisLayer('township')"><span>鄉鎮界線</span></label>
          <button class="gis-fs-btn" onclick="toggleGisFullscreen()" title="全螢幕">⛶</button>
          <button class="gis-fs-btn" onclick="refreshGisMapData()" title="重新載入地圖資料">🔄</button>
        </div>
      </div>
    </div>

    <div class="gis-map-wrapper" id="gisMapWrapper">
      <div id="map"></div>
      <div class="gis-legend">
        <div class="gis-legend-title">📍 圖例</div>
        <div class="legend-section">魚道類型</div>
        <div class="legend-row"><span class="legend-dot" style="background:#1565c0"></span>之字形魚道</div>
        <div class="legend-row"><span class="legend-dot" style="background:#0d47a1"></span>降壩魚道</div>
        <div class="legend-row"><span class="legend-dot" style="background:#00838f"></span>潛越式魚道</div>
        <div class="legend-row"><span class="legend-dot" style="background:#1976d2"></span>階段式魚道</div>
        <div class="legend-row"><span class="legend-dot" style="background:#0288d1"></span>斜坡式魚道</div>
        <div class="legend-row"><span class="legend-dot" style="background:#4527a0"></span>粗石斜曲面式</div>
        <div class="legend-row"><span class="legend-dot" style="background:#00695c"></span>改良型舟通式</div>
        <div class="legend-section">其他構造物</div>
        <div class="legend-row"><span class="legend-dot" style="background:#827717;border-radius:3px"></span>固床工</div>
        <div class="legend-row"><span class="legend-dot" style="background:#558b2f;border-radius:3px"></span>隔梳式固床工</div>
        <div class="legend-row"><span class="legend-dot" style="background:#33691e;border-radius:3px"></span>階梯式固床工</div>
        <div class="legend-row"><span class="legend-dot" style="background:#795548;border-radius:3px"></span>防砂構造物</div>
        <div class="legend-row"><span class="legend-dot" style="background:#546e7a;border-radius:3px;transform:rotate(45deg);margin:2px"></span>護岸</div>
        <div class="legend-row"><span class="legend-ring orange-ring"></span>損壞／需維護</div>
        <div class="legend-section">棲地調查</div>
        <div class="legend-row"><span class="legend-tri green-tri"></span>電魚調查樣站</div>
        <div class="legend-row"><span class="legend-tri teal-tri"></span>水質監測站</div>
        <div class="legend-row"><span class="legend-model"></span>棲地二維模式分區</div>
        <div class="legend-section">其他圖層</div>
        <div class="legend-row"><span class="legend-line red"></span>集水區邊界</div>
        <div class="legend-row"><span class="legend-dot pink"></span>巡查異常點</div>
        <div class="legend-row"><span class="legend-circle orange"></span>異常熱區</div>
        <div class="legend-source">資料來源：107-108年成果報告</div>
      </div>
    </div>
    <div class="gis-bottom-tabs">
      <button class="gis-tab active" onclick="setGisPreset('watershed',this)">集水區範圍</button>
      <button class="gis-tab" onclick="setGisPreset('facilities',this)">重要設施</button>
      <button class="gis-tab" onclick="setGisPreset('survey',this)">調查樣站</button>
      <button class="gis-tab" onclick="setGisPreset('habitatModel',this)">棲地二維模式</button>
      <div class="gis-zoom-control">縮放
        <input type="range" min="12" max="18" value="14" oninput="leafletMap&&leafletMap.setZoom(+this.value)" style="width:100px;accent-color:var(--primary)">
      </div>
    </div>
    <div class="photo-viewer" id="photoViewer" style="display:none" onclick="closePhotoViewer(event)">
      <div class="photo-viewer-inner">
        <button class="pv-close" onclick="closePhotoViewer()">✕</button>
        <button class="pv-prev" onclick="changePhoto(-1);event.stopPropagation()">&#10094;</button>
        <img id="pvImg" src="" alt="">
        <button class="pv-next" onclick="changePhoto(1);event.stopPropagation()">&#10095;</button>
        <div class="pv-counter" id="pvCounter"></div>
      </div>
    </div>
  `;
  injectGisStyles();
  setTimeout(initGisMap, 120);
}

function injectGisStyles() {
  if (document.getElementById('gisStyle')) return;
  const s = document.createElement('style');
  s.id = 'gisStyle';
  s.textContent = `
    .gis-topbar{background:#fff;border-bottom:1px solid var(--border);padding:10px 20px 8px;margin:-24px -24px 0}
    .gis-section-label{font-size:11px;color:var(--text-muted);margin-bottom:4px}
    .gis-title-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}
    .gis-main-title{font-size:18px;font-weight:700;color:var(--text);margin:0}
    .gis-layer-toggles{display:flex;gap:8px;flex-wrap:wrap}
    .gis-toggle{display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;padding:4px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:20px;user-select:none}
    .gis-toggle input{accent-color:var(--primary);cursor:pointer}
    .gis-toggle:has(input:checked){background:#e8f5e9;border-color:#a5d6a7}
    .gis-map-wrapper{position:relative;margin:0 -24px;overflow:hidden}
    #map{height:680px}
    .gis-map-wrapper.fullscreen{position:fixed!important;inset:0;margin:0;z-index:8000}
    .gis-map-wrapper.fullscreen #map{height:100vh!important}
    .gis-fs-btn{background:none;border:1px solid #e2e8f0;border-radius:6px;padding:3px 8px;font-size:16px;cursor:pointer;color:#555;line-height:1}
    .gis-legend{position:absolute;top:12px;right:12px;background:rgba(255,255,255,0.97);border-radius:8px;padding:12px 14px;box-shadow:0 2px 12px rgba(0,0,0,0.18);z-index:500;min-width:168px;max-height:calc(100vh - 230px);overflow-y:auto;backdrop-filter:blur(4px)}
    .gis-legend-title{font-weight:700;font-size:13px;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:4px}
    .legend-section{font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:8px 0 4px;padding-top:4px;border-top:1px solid #f0f0f0}
    .legend-section:first-of-type{margin-top:0;padding-top:0;border-top:none}
    .legend-source{font-size:10px;color:#aaa;margin-top:8px;padding-top:6px;border-top:1px solid #eee;text-align:center}
    .legend-row,.legend-dot-row{display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:5px}
    .legend-line{display:inline-block;width:20px;height:3px;border-radius:2px;flex-shrink:0}
    .legend-line.red{background:#e53935}.legend-line.blue-line{background:#42a5f5}
    .legend-dot{width:11px;height:11px;border-radius:50%;display:inline-block;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.22);flex-shrink:0}
    .legend-dot.blue{background:#1565c0}.legend-dot.teal{background:#00838f}.legend-dot.red2{background:#c62828}
    .legend-dot.olive{background:#827717}.legend-dot.dgreen{background:#558b2f}
    .legend-dot.green{background:#2e7d32}.legend-dot.pink{background:#c2185b}.legend-dot.slate{background:#546e7a}
    .legend-ring{width:11px;height:11px;border-radius:50%;display:inline-block;background:transparent;flex-shrink:0}
    .legend-ring.orange-ring{border:2px solid #f44336}
    .legend-circle{width:14px;height:14px;border-radius:50%;display:inline-block;background:rgba(230,81,0,0.4);border:2px solid #e65100;flex-shrink:0}
    .legend-tri{width:0;height:0;display:inline-block;border-left:6px solid transparent;border-right:6px solid transparent;flex-shrink:0}
    .legend-tri.green-tri{border-bottom:11px solid #2e7d32}
    .legend-tri.teal-tri{border-bottom:11px solid #00796b}
    .legend-model{width:22px;height:12px;border-radius:3px;display:inline-block;background:linear-gradient(90deg,#2563eb,#06b6d4,#22c55e,#f59e0b,#ef4444);border:1px solid rgba(15,23,42,.25);flex-shrink:0}
    .gis-bottom-tabs{background:#fff;border-top:1px solid var(--border);padding:10px 20px;margin:0 -24px;display:flex;align-items:center;gap:8px}
    .gis-tab{padding:6px 18px;border-radius:20px;border:1px solid var(--border);background:#fff;font-size:13px;cursor:pointer;transition:all 0.2s}
    .gis-tab:hover{background:var(--bg)}.gis-tab.active{background:var(--primary);color:#fff;border-color:var(--primary)}
    .gis-zoom-control{margin-left:auto;display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-light)}
    .fp-wrap{font-family:'Microsoft JhengHei',sans-serif;min-width:280px;max-width:340px}
    .fp-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;gap:8px}
    .fp-name{font-weight:700;font-size:14px;color:#1a1a1a;line-height:1.3}
    .fp-code{font-size:11px;color:#888;margin-top:2px}
    .fp-badge{padding:2px 8px;border-radius:10px;font-size:11px;color:#fff;font-weight:600;white-space:nowrap;flex-shrink:0}
    .fp-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;font-size:12px}
    .fp-item span{color:#888;display:block}.fp-item strong{color:#222}
    .fp-note{font-size:12px;color:#555;background:#f5f5f5;padding:6px 8px;border-radius:4px;margin-bottom:10px;line-height:1.5}
    .fp-photos{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-bottom:8px}
    .fp-photo{width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;cursor:pointer;border:2px solid transparent;transition:border-color 0.15s}
    .fp-photo:hover{border-color:var(--primary)}
    .fp-no-photo{grid-column:1/-1;text-align:center;color:#aaa;font-size:12px;padding:10px}
    .fp-actions{display:flex;gap:6px}
    .fp-btn{flex:1;padding:5px;border-radius:4px;border:none;font-size:12px;cursor:pointer;font-family:inherit}
    .fp-btn-primary{background:#1a6b3c;color:#fff}.fp-btn-outline{background:#f5f5f5;color:#333;border:1px solid #ddd}
    .photo-viewer{position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center}
    .photo-viewer-inner{position:relative;max-width:90vw;max-height:90vh;display:flex;align-items:center;gap:8px}
    .photo-viewer-inner img{max-width:85vw;max-height:85vh;object-fit:contain;border-radius:4px}
    .pv-close{position:absolute;top:-36px;right:-8px;background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px}
    .pv-prev,.pv-next{background:rgba(255,255,255,0.15);border:none;color:#fff;width:40px;height:40px;border-radius:50%;cursor:pointer;font-size:20px;flex-shrink:0}
    .pv-prev:hover,.pv-next:hover{background:rgba(255,255,255,0.3)}
    .pv-counter{position:absolute;bottom:-28px;left:50%;transform:translateX(-50%);color:#ccc;font-size:13px}
    .anomaly-tip{background:rgba(183,28,28,0.85)!important;color:#fff!important;border:none!important;font-size:11px!important;font-weight:600!important;padding:2px 6px!important}
    .leaflet-tooltip.anomaly-tip::before{display:none}
    .station-km-label{background:rgba(255,255,255,0.92)!important;color:#1565c0!important;border:1px solid #90caf9!important;font-size:10px!important;font-weight:700!important;padding:1px 5px!important;border-radius:3px!important;white-space:nowrap!important;box-shadow:0 1px 4px rgba(0,0,0,0.15)!important}
    .leaflet-tooltip.station-km-label::before{display:none}
  `;
  document.head.appendChild(s);
}

function initGisMap() {
  // 診斷：列印設施資料驗證
  const facs = DB.getAll('facilities').filter(f => f.lat && f.lng);
  console.log(`[GIS] Loading ${facs.length} facilities:`, facs.map(f => ({id: f.id, name: f.name, lat: f.lat, lng: f.lng})));

  if (leafletMap) { leafletMap.remove(); leafletMap = null; }
  leafletMap = L.map('map', { zoomControl: false }).setView([24.183, 120.909], 15);
  L.control.zoom({ position: 'bottomleft' }).addTo(leafletMap);

  // ===== 底圖層（含高清衛星影像） =====
  const baseLayers = {
    '📍 道路圖': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 19
    }),
    '🛰️ 高清衛星': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri World Imagery', maxZoom: 19, maxNativeZoom: 18
    }),
    '🗺️ 衛星+路線': L.layerGroup([
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri World Imagery', maxZoom: 19, maxNativeZoom: 18
      }),
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 19, opacity: 0.6
      })
    ]),
    '🌍 地形圖': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenTopoMap', maxZoom: 17
    })
  };

  // 預設啟用高清衛星
  baseLayers['🛰️ 高清衛星'].addTo(leafletMap);

  // 添加底圖切換控制器
  L.control.layers(baseLayers, {}, { position: 'topright', collapsed: false }).addTo(leafletMap);

  // ===== 集水區邊界（真實 KML） =====
  watershedLayer = L.polygon(WATERSHED_COORDS, {
    color: '#e53935', weight: 2.5, dashArray: '6,4', fillColor: '#ef9a9a', fillOpacity: 0.07
  }).bindTooltip('橫流溪子集水區 (1004012)', { sticky: true });

  // ===== 里程節點標示 =====
  STATION_MARKERS.forEach(s => {
    const ic = L.divIcon({
      className: '',
      html: `<div style="background:${s.color};color:#fff;font-size:9px;font-weight:700;padding:2px 5px;border-radius:3px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.6)">${s.km}</div>`,
      iconAnchor: [0, 0]
    });
    L.marker([s.lat, s.lng], { icon: ic, interactive: false }).addTo(leafletMap);
  });

  // ===== 工程設施 =====
  mapLayerGroups.facilities = L.layerGroup();
  DB.getAll('facilities').filter(f => f.lat && f.lng).forEach(f => {
    mapLayerGroups.facilities.addLayer(createFacilityMarker(f));
  });

  // ===== 棲地調查點（三角形圖示，區分電魚/水質） =====
  mapLayerGroups.habitat = L.layerGroup();
  DB.getAll('habitats').filter(h => h.lat && h.lng).forEach(h => {
    const isWater = h.surveyMethod === '水質採樣' || h.type === '水質調查';
    const triColor = isWater ? '#00796b' : '#2e7d32';
    const triIcon = L.divIcon({
      className: '',
      html: `<div style="position:relative;width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:18px solid ${triColor};filter:drop-shadow(0 2px 3px rgba(0,0,0,0.4));cursor:pointer" title="${h.name}"></div>`,
      iconSize: [20, 18], iconAnchor: [10, 18]
    });
    const twd97str = (h.twd97x && h.twd97y)
      ? `<div style="font-size:11px;color:#555;background:#f0f7f0;padding:4px 6px;border-radius:3px;margin:6px 0"><b>TWD97：</b>X=${h.twd97x}, Y=${h.twd97y}</div>`
      : '';
    const stationStr = h.stationKm ? `<span style="background:#e8f5e9;color:#1b5e20;font-size:11px;padding:1px 6px;border-radius:10px;margin-left:4px">${h.stationKm}</span>` : '';
    const sourceStr = h.source ? `<div style="font-size:10px;color:#999;margin-top:4px">📄 資料來源：${h.source}</div>` : '';
    L.marker([h.lat, h.lng], { icon: triIcon })
      .bindPopup(`<div style="font-family:'Microsoft JhengHei',sans-serif;min-width:220px;max-width:280px">
        <div style="font-weight:700;font-size:13px;margin-bottom:4px">${isWater ? '💧' : '🌿'} ${h.name}</div>
        <div style="font-size:12px;color:#666;margin-bottom:6px">${h.type} · ${h.surveyMethod||'調查'} · ${h.date}${stationStr}</div>
        ${twd97str}
        ${h.area ? `<div style="font-size:12px;margin-bottom:2px">面積：${h.area}m²${h.depth ? ' · 水深：'+h.depth+'m' : ''}</div>` : ''}
        <div style="font-size:12px;color:#555;background:#f9f9f9;padding:5px 7px;border-radius:4px;line-height:1.5;margin-top:4px">${h.note||''}</div>
        ${sourceStr}
      </div>`, { maxWidth: 300 })
      .addTo(mapLayerGroups.habitat);
  });

  // ===== 流速流量巡查點 =====
  mapLayerGroups.habitatModel = L.layerGroup();
  HABITAT_MODEL_ZONES.forEach(zone => {
    const poly = L.polygon(zone.coords, {
      color: zone.color,
      weight: 2.4,
      fillColor: zone.color,
      fillOpacity: 0.26,
      dashArray: '6,4'
    }).bindPopup(createHabitatModelPopup(zone), { maxWidth: 380 });
    poly.bindTooltip(`${zone.id} ${zone.station}`, {
      permanent: true,
      direction: 'center',
      className: 'station-km-label'
    });
    poly.addTo(mapLayerGroups.habitatModel);

    L.circleMarker(zone.center, {
      radius: 7,
      color: '#fff',
      weight: 2,
      fillColor: zone.color,
      fillOpacity: 0.95
    }).bindPopup(createHabitatModelPopup(zone), { maxWidth: 380 })
      .addTo(mapLayerGroups.habitatModel);
  });

  SURVEY_POINTS.forEach(sp => {
    L.circleMarker([sp.lat, sp.lng], { radius: 7, fillColor: '#0288d1', color: '#fff', weight: 2, fillOpacity: 0.9 })
      .bindTooltip(sp.label, { permanent: true, direction: 'right', className: 'survey-tip', offset: [8, 0] })
      .addTo(leafletMap);
  });

  // ===== 巡查異常點 =====
  mapLayerGroups.inspection = L.layerGroup();
  DB.getAll('inspections').filter(i => i.status !== '完成').forEach(ins => {
    const fac = DB.getById('facilities', ins.facilityId);
    if (!fac?.lat) return;
    L.circleMarker([fac.lat + 0.0005, fac.lng + 0.0004], {
      radius: 7, fillColor: '#c2185b', color: '#fff', weight: 2, fillOpacity: 0.9
    }).bindPopup(`<div style="font-family:'Microsoft JhengHei',sans-serif"><b>⚠️ ${ins.facilityName}</b><br><span style="font-size:12px;color:#c62828">${ins.findings.substring(0,90)}</span><br><span style="font-size:11px;color:#888">${ins.date} · ${ins.inspector}</span></div>`, { maxWidth: 240 })
      .addTo(mapLayerGroups.inspection);
  });

  // ===== 異常熱區 =====
  mapLayerGroups.anomaly = L.layerGroup();
  ANOMALY_ZONES.forEach(z => {
    L.circle([z.lat, z.lng], { radius: z.radius, color: z.color, weight: 1.5, fillColor: z.color, fillOpacity: 0.25 })
      .bindTooltip(z.label, { permanent: true, direction: 'top', className: 'anomaly-tip', offset: [0, -10] })
      .addTo(mapLayerGroups.anomaly);
  });

  // ===== 道路路網圖層（OpenStreetMap 標準底圖疊加）=====
  mapLayerGroups.roads = L.layerGroup();
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19, opacity: 0.55
  }).addTo(mapLayerGroups.roads);

  // ===== 鄉鎮市區界線（NLSC 國土測繪中心 WMS）=====
  mapLayerGroups.township = L.layerGroup();
  L.tileLayer.wms('https://wms.nlsc.gov.tw/wms', {
    layers: 'TOWN',
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    attribution: '國土測繪中心',
    maxZoom: 19,
    opacity: 0.7
  }).addTo(mapLayerGroups.township);

  watershedLayer.addTo(leafletMap);
  // 預設開啟的圖層
  Object.entries(mapLayerGroups).forEach(([key, g]) => {
    if (!['roads','township'].includes(key)) g.addTo(leafletMap);
  });

  // 預設視角：設施聚集區域（0K+460~1K+400），而非整個大集水區
  const facPts = DB.getAll('facilities').filter(f => f.lat && f.lng).map(f => [f.lat, f.lng]);
  if (facPts.length) {
    leafletMap.fitBounds(L.latLngBounds(facPts).pad(0.22));
  } else {
    leafletMap.setView([24.183, 120.909], 15);
  }
}

/* ── 全螢幕切換 ── */
function createHabitatModelPopup(zone) {
  const speciesRows = zone.species.map(item => `
    <tr>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb">${item[0]}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;color:#0f766e">${item[1]}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:right">${item[2]} m²</td>
    </tr>
  `).join('');

  return `
    <div style="font-family:'Microsoft JhengHei',sans-serif;min-width:310px;max-width:360px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${zone.color}"></span>
        <div>
          <div style="font-weight:700;font-size:14px;color:#0f172a">${zone.name}</div>
          <div style="font-size:11px;color:#64748b">${zone.id} · 施工前模擬</div>
        </div>
      </div>
      <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;padding:8px;margin-bottom:8px;font-size:12px;line-height:1.7">
        <div><b>樁號河段：</b>${zone.station}</div>
        <div><b>對應構造物：</b>${zone.structure}</div>
        <div><b>常流水區域面積：</b>${zone.area.toLocaleString()} m²</div>
      </div>
      <div style="font-size:12px;font-weight:700;margin:8px 0 5px">棲地可使用面積權重 WUA</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#ecfeff;color:#155e75">
            <th style="padding:5px 6px;text-align:left">目標魚種</th>
            <th style="padding:5px 6px;text-align:right">權重%</th>
            <th style="padding:5px 6px;text-align:right">WUA</th>
          </tr>
        </thead>
        <tbody>${speciesRows}</tbody>
      </table>
      <div style="margin-top:8px;padding:8px;border-radius:6px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-size:12px;line-height:1.6">
        此圖層用於快速判讀魚道上下游是否具備連續深槽、緩流避難帶與淺瀨覓食區，並支援和工程設施圖層套疊檢視。
      </div>
    </div>
  `;
}

function gisGoogleMapsPointUrl(lat, lng) {
  const point = `${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
  return `https://www.google.com/maps/place/${encodeURIComponent(point)}/@${point},18z/data=!3m1!1e3`;
}

function toggleGisFullscreen() {
  const wrapper = document.getElementById('gisMapWrapper');
  if (!wrapper) return;
  const isFs = wrapper.classList.toggle('fullscreen');

  // 確保地圖在DOM改變後重新計算大小
  if (leafletMap) {
    setTimeout(() => {
      leafletMap.invalidateSize(false);
    }, 50);
  }

  const btn = document.querySelector('.gis-fs-btn');
  if (btn) btn.textContent = isFs ? '✕ 退出全螢幕' : '⛶';
}

/* ── 重新載入地圖資料（清除緩存並刷新） ── */
function refreshGisMapData() {
  console.log('[GIS] Refreshing map data...');
  // 清除 localStorage 以強制重載資料
  localStorage.removeItem(DB.KEY);
  console.log('[GIS] localStorage cleared. Reinitializing map...');
  // 重新初始化地圖
  setTimeout(() => {
    initGisMap();
    console.log('[GIS] Map reinitialized successfully');
  }, 100);
}

/* ── 診斷函數：驗證設施座標是否正確 ── */
window.diagnosticMapCoordinates = function() {
  console.group('GIS Coordinate Diagnostic Report');
  console.log('DB VERSION:', DB.VERSION);
  const facilities = DB.getAll('facilities').filter(f => f.lat && f.lng);
  console.log(`\n✓ 載入 ${facilities.length} 筆設施座標`);

  const expectedCoords = {
    '溪構8-2': { id: 1, lat: 24.180055, lng: 120.908622 },
    '溪構11': { id: 3, lat: 24.180471, lng: 120.908621 },
    '溪構7': { id: 4, lat: 24.180922, lng: 120.908503 },
    '溪構6': { id: 5, lat: 24.181672, lng: 120.909300 },
    '溪構5-1': { id: 6, lat: 24.183541, lng: 120.909564 },
    '溪構5-2': { id: 7, lat: 24.183541, lng: 120.909564 },
    '溪構4': { id: 9, lat: 24.184805, lng: 120.909760 },
    '溪構3': { id: 10, lat: 24.185158, lng: 120.910163 },
    '溪構1-1': { id: 13, lat: 24.186629, lng: 120.909306 }
  };

  console.log('\n座標驗證結果：');
  Object.entries(expectedCoords).forEach(([name, expected]) => {
    const actual = facilities.find(f => f.id === expected.id);
    if (actual) {
      const latMatch = Math.abs(actual.lat - expected.lat) < 0.00001;
      const lngMatch = Math.abs(actual.lng - expected.lng) < 0.00001;
      const status = (latMatch && lngMatch) ? '✓' : '✗';
      console.log(`${status} ${name} (id:${actual.id}): lat=${actual.lat} lng=${actual.lng}`);
    } else {
      console.warn(`✗ ${name} (id:${expected.id}) 未找到`);
    }
  });
  console.groupEnd();
};

// 頁面載入完成後自動執行診斷
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    console.log('[GIS] 若座標有問題，請在控制台執行: diagnosticMapCoordinates()');
  }, 500);
});

function createFacilityMarker(f) {
  // 依 subType 決定顏色與縮寫（對應107-108報告全部魚道類型）
  const subTypeMap = {
    '之字形魚道':     { color: '#1565c0', short: '之', shape: 'circle' },
    '降壩魚道':       { color: '#0d47a1', short: '降', shape: 'circle' },
    '潛越式魚道':     { color: '#00838f', short: '潛', shape: 'circle' },
    '階段式魚道':     { color: '#1976d2', short: '階', shape: 'circle' },
    '斜坡魚道':       { color: '#0288d1', short: '斜', shape: 'circle' },
    '粗石斜曲面式魚道': { color: '#4527a0', short: '粗', shape: 'circle' },
    '改良型舟通式魚道': { color: '#00695c', short: '舟', shape: 'circle' },
    '固床工':         { color: '#827717', short: '床', shape: 'square' },
    '隔梳式固床工':   { color: '#558b2f', short: '隔', shape: 'square' },
    '階梯式固床工':   { color: '#33691e', short: '梯', shape: 'square' },
    '防砂構造物':     { color: '#795548', short: '砂', shape: 'square' },
    '護岸':           { color: '#546e7a', short: '護', shape: 'diamond' }
  };
  const fallback = { '魚道': { color: '#1976d2', short: '魚', shape: 'circle' }, '固床工': { color: '#827717', short: '床', shape: 'square' }, '護岸': { color: '#546e7a', short: '護', shape: 'diamond' } };
  const cfg = subTypeMap[f.subType] || fallback[f.type] || { color: '#455a64', short: '構', shape: 'circle' };
  const ring = f.status === '損壞' ? '#f44336' : f.status === '需維護' ? '#ff9800' : '#4caf50';

  // 形狀樣式
  let shapeStyle = 'border-radius:50%';
  if (cfg.shape === 'square') shapeStyle = 'border-radius:4px';
  if (cfg.shape === 'diamond') shapeStyle = 'border-radius:3px;transform:rotate(45deg)';
  const innerStyle = cfg.shape === 'diamond' ? 'transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;width:100%;height:100%' : 'display:flex;align-items:center;justify-content:center;width:100%;height:100%';

  // 狀態圖示
  const statusDot = f.status !== '正常' ? `<div style="position:absolute;top:-3px;right:-3px;width:8px;height:8px;border-radius:50%;background:${ring};border:1px solid #fff;z-index:1"></div>` : '';

  const icon = L.divIcon({
    className: '',
    html: `<div style="position:relative;width:28px;height:28px">
      ${statusDot}
      <div style="background:${cfg.color};color:#fff;${shapeStyle};width:28px;height:28px;font-size:10px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.45);border:3px solid ${ring};cursor:pointer;position:relative">
        <div style="${innerStyle}">${cfg.short}</div>
      </div>
    </div>`,
    iconSize: [28, 28], iconAnchor: [14, 14]
  });

  const marker = L.marker([f.lat, f.lng], { icon })
    .bindPopup(() => buildFacilityPopup(f), { maxWidth: 380, minWidth: 310 });

  // 永久里程標籤
  if (f.stationKm) {
    marker.bindTooltip(f.stationKm, {
      permanent: true, direction: 'bottom', offset: [0, 6],
      className: 'station-km-label'
    });
  }
  return marker;
}

function buildFacilityPopup(f) {
  const statusColor = { '正常': '#2e7d32', '需維護': '#e65100', '損壞': '#c62828' };
  const stars = n => `<span style="color:#f59e0b">${'★'.repeat(n)}${'☆'.repeat(5-n)}</span>`;

  // 計算健康指數（需要fac_health函數，在facilities.js中定義）
  const getHealth = () => {
    if (typeof fac_health === 'function') return fac_health(f);
    // 簡化計算
    const c = f.condition || 3;
    const dmg = f.status === '損壞' ? 2 : f.status === '需維護' ? 1 : 0;
    const base = { 5: 40, 4: 32, 3: 24, 2: 14, 1: 5 }[c] || 24;
    return Math.max(15, Math.min(95, base - (dmg === 2 ? 20 : dmg === 1 ? 8 : 0)));
  };
  const hp = getHealth();
  const hpColor = hp >= 80 ? '#2e7d32' : hp >= 60 ? '#1565c0' : hp >= 40 ? '#e65100' : '#c62828';

  const photosHtml = f.photos?.length
    ? f.photos.map((p,i) => `<img class="fp-photo" src="${p}" alt="照片${i+1}" onerror="this.style.display='none'">`).join('')
    : '<div class="fp-no-photo">📷 暫無照片</div>';

  const div = document.createElement('div');
  div.className = 'fp-wrap';
  div.innerHTML = `
    <div class="fp-header">
      <div><div class="fp-name">${f.name}</div><div class="fp-code">ID:${f.id} · ${f.location}</div></div>
      <span class="fp-badge" style="background:${statusColor[f.status]||'#555'}">${f.status}</span>
    </div>

    <!-- 設施基本資訊 -->
    <div class="fp-grid">
      <div class="fp-item"><span>設施編號</span><strong>${f.id}</strong></div>
      <div class="fp-item"><span>設施類型</span><strong>${f.subType||f.type}</strong></div>
      <div class="fp-item"><span>所屬溪流</span><strong>橫流溪</strong></div>
      <div class="fp-item"><span>里程桩號</span><strong style="color:#1565c0">${f.stationKm||'-'}</strong></div>
      <div class="fp-item"><span>建造年度</span><strong>民國 ${f.year} 年</strong></div>
      <div class="fp-item"><span>調查年度</span><strong>107～108年</strong></div>
    </div>

    <!-- 座標資訊 -->
    <div style="background:#f0f7ff;border-radius:4px;padding:8px;margin-bottom:8px;font-size:11px;line-height:1.6">
      <div><b>📍 TWD97</b><br/>X: ${f.twd97x?.toLocaleString()||'-'}<br/>Y: ${f.twd97y?.toLocaleString()||'-'}</div>
      <div style="margin-top:4px"><b>📍 WGS84</b><br/>Lat: ${f.lat?.toFixed(5)}°N<br/>Lng: ${f.lng?.toFixed(5)}°E</div>
    </div>

    <!-- 健康指數 -->
    <div style="background:${hpColor}11;border-left:3px solid ${hpColor};border-radius:4px;padding:8px;margin-bottom:8px">
      <div style="font-weight:700;color:${hpColor};font-size:13px">健康指數: ${hp}%</div>
      <div style="height:4px;background:#ddd;border-radius:2px;margin:4px 0;overflow:hidden">
        <div style="height:100%;width:${hp}%;background:${hpColor};border-radius:2px"></div>
      </div>
    </div>

    <!-- 狀況與評分 -->
    <div class="fp-grid" style="gap:8px">
      <div class="fp-item"><span>狀況評分</span><strong>${stars(f.condition||0)}</strong></div>
      <div class="fp-item"><span>材料</span><strong>${f.material||'-'}</strong></div>
      <div class="fp-item"><span>最後巡查</span><strong>${f.lastInspect||'-'}</strong></div>
    </div>

    <!-- 備註 -->
    ${f.note ? `<div style="font-size:11px;background:#fffde7;border-left:3px solid #f9a825;border-radius:0 4px 4px 0;padding:6px 8px;margin-bottom:8px;line-height:1.5">${f.note}</div>` : ''}

    <!-- 現場照片 -->
    <div style="margin-bottom:8px">
      <div style="font-size:11px;color:#666;margin-bottom:4px;font-weight:600">📷 現場照片（${f.photos?.length||0} 張）</div>
      <div class="fp-photos">${photosHtml}</div>
    </div>

    <!-- 資料來源 -->
    ${f.source ? `<div style="font-size:10px;color:#888;margin-bottom:8px;text-align:center">📄 資料來源：${f.source}</div>` : ''}

    <!-- 操作按鈕 -->
    <div class="fp-actions">
      <button class="fp-btn fp-btn-primary" onclick="navigateTo('facilities');viewFacility(${f.id})">詳細資料</button>
      <button class="fp-btn fp-btn-outline" onclick="navigateTo('inspection')">巡查紀錄</button>
      <button class="fp-btn" style="background:#4285f4;color:#fff;border:none;padding:5px 8px;font-size:11px"
        onclick="window.open(gisGoogleMapsPointUrl(${f.lat}, ${f.lng}),'_blank')">
        📍 Google Maps
      </button>
    </div>`;

  // 綁定照片點擊事件
  setTimeout(() => {
    div.querySelectorAll('.fp-photo').forEach((img, idx) => {
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        if (f.photos?.length) openPhotoViewer(f.photos, idx);
      });
      img.style.cursor = 'pointer';
    });
  }, 10);

  return div;
}

// 照片檢視
function openPhotoViewer(photosJson, index) {
  currentPhotos = typeof photosJson === 'string' ? JSON.parse(photosJson.replace(/'/g,'"')) : photosJson;
  currentPhotoIndex = index;
  updatePhotoViewer();
  document.getElementById('photoViewer').style.display = 'flex';
}
function updatePhotoViewer() {
  document.getElementById('pvImg').src = currentPhotos[currentPhotoIndex];
  document.getElementById('pvCounter').textContent = `${currentPhotoIndex+1} / ${currentPhotos.length}`;
}
function changePhoto(dir) {
  currentPhotoIndex = (currentPhotoIndex + dir + currentPhotos.length) % currentPhotos.length;
  updatePhotoViewer();
}
function closePhotoViewer(e) {
  if (!e || e.target === document.getElementById('photoViewer')) {
    document.getElementById('photoViewer').style.display = 'none';
  }
}

// 圖層切換
function toggleGisLayer(name) {
  const ids = {
    watershed: 'lyrWatershed',
    facilities: 'lyrFacilities',
    habitat: 'lyrHabitat',
    habitatModel: 'lyrHabitatModel',
    inspection: 'lyrInspection',
    anomaly: 'lyrAnomaly',
    roads: 'lyrRoads',
    township: 'lyrTownship'
  };
  const on = document.getElementById(ids[name])?.checked;
  if (!leafletMap) return;
  if (name === 'watershed') {
    on ? watershedLayer?.addTo(leafletMap) : watershedLayer?.remove();
  } else {
    on ? mapLayerGroups[name]?.addTo(leafletMap) : mapLayerGroups[name]?.remove();
  }
}

// 預設視角
function setGisPreset(preset, btn) {
  document.querySelectorAll('.gis-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (!leafletMap) return;
  if (preset === 'watershed') leafletMap.fitBounds(L.latLngBounds(WATERSHED_COORDS).pad(0.02));
  else if (preset === 'facilities') {
    const facs = DB.getAll('facilities').filter(f => f.lat && f.lng);
    if (facs.length) leafletMap.fitBounds(L.latLngBounds(facs.map(f=>[f.lat,f.lng])).pad(0.15));
  } else if (preset === 'habitatModel') {
    leafletMap.fitBounds(L.latLngBounds(HABITAT_MODEL_ZONES.flatMap(z => z.coords)).pad(0.18));
  } else {
    const habs = DB.getAll('habitats').filter(h => h.lat && h.lng);
    if (habs.length) leafletMap.fitBounds(L.latLngBounds(habs.map(h=>[h.lat,h.lng])).pad(0.2));
  }
}

/* ── 設施快速定位搜尋 ── */
function gisSearchFacilities() {
  const keyword = document.getElementById('gisSearchInput')?.value?.toLowerCase() || '';
  const typeFilter = document.getElementById('gisFilterType')?.value || '';
  const yearFilter = document.getElementById('gisFilterYear')?.value || '';

  let results = DB.getAll('facilities').filter(f => f.lat && f.lng);

  if (keyword) {
    results = results.filter(f =>
      f.name.toLowerCase().includes(keyword) ||
      (f.stationKm || '').includes(keyword) ||
      (f.id || '').toString().includes(keyword)
    );
  }
  if (typeFilter) results = results.filter(f => f.type === typeFilter);
  if (yearFilter) results = results.filter(f => (f.year || '').toString().includes(yearFilter));

  const resultsDiv = document.getElementById('gisSearchResults');
  if (!resultsDiv) return;

  if (results.length === 0) {
    resultsDiv.innerHTML = '<div style="padding:16px;text-align:center;color:#aaa;font-size:12px">查無符合的設施</div>';
    return;
  }

  resultsDiv.innerHTML = results.map(f => `
    <div class="gis-search-result-item" onclick="gisLocateFacility(${f.id})">
      <div class="gis-search-result-name">${f.name}</div>
      <div class="gis-search-result-info">${f.stationKm || '-'} · ${f.type}</div>
    </div>
  `).join('');
}

function gisLocateFacility(facId) {
  const fac = DB.getById('facilities', facId);
  if (!fac || !fac.lat || !fac.lng || !leafletMap) return;

  // 縮放到設施位置
  leafletMap.flyTo([fac.lat, fac.lng], 16, { duration: 0.8 });

  // 觸發現有的設施標記點擊事件（打開popup）
  setTimeout(() => {
    const allLayers = [];
    if (mapLayerGroups.facilities) {
      mapLayerGroups.facilities.eachLayer(layer => {
        if (layer.feature?.properties?.id === facId) {
          layer.openPopup();
        }
      });
    }
  }, 600);
}
