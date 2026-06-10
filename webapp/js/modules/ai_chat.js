// ═══════════════════════════════════════════════════════
//  橫流溪 AI 本機知識庫引擎
//  不需伺服器；從已載入的報告資料 + 靜態知識庫即時回答
// ═══════════════════════════════════════════════════════

// ── 靜態知識庫條目 ──────────────────────────────────────
const HLX_KB = [
  // ── 工程設施通用 ──
  { id:'deru_general', kw:['deru','d值','e值','r值','u值','劣化','損壞範圍','影響','急迫','評分','評等','健康指數'],
    title:'DER&U 評估方法說明',
    body:`DER&U 是橫流溪工程設施健康評估的核心指標，由四個分項組成：
D（劣化程度 Deterioration）：0=無異狀、1=輕微、2=中等、3=嚴重、4=極嚴重
E（損壞範圍 Extent）：評估損壞面積佔全體構造物的比例
R（影響性 Relevance）：損壞對功能、安全及生態的衝擊程度
U（急迫性 Urgency）：根據D×E×R綜合分數自動建議處置時程

綜合評分計算：Score = D × E × R
  ≤ 10：維護級（定期觀察）
  11-20：警示級（近期改善）
  ≥ 21：緊急級（立即處置）

巡查紀錄應每季更新D、E、R數值；自動計算結果儲存於系統管理資料庫。
建議優先改善評分≥21分的構造物。` },

  { id:'facility_type', kw:['固床工','護岸','排水','魚道','壩','跌水','溪構','設施','構造物','工程'],
    title:'橫流溪工程設施類型',
    body:`橫流溪主要工程設施分類（0K+460 至 1K+400 範圍）：

1. 固床工（溪構系列）：重力式或格框型混凝土結構，防止溪床下切，兼具集水與生態棲地功能。常見缺損：壩頂開裂、翼牆位移、下游護坦沖刷。

2. 魚道（FD1-FD8）：共8座，配合各壩址設置，確保魚類上下游洄游通道。型式包含粗石斜曲面、改良型舟通式、階段式、潛越式、梯狀。

3. 護岸：漿砌石或混凝土，保護溪岸免受沖刷，維護兩岸植生緩衝帶。

4. 排水設施：聯絡便道排水溝、橫向排水管等，維持路面與堤岸穩定。

5. 濱溪生態帶：種植原生植物（61種），設置根團微棲地，提升水棲昆蟲多樣性。` },

  { id:'xlx52', kw:['溪構5-2','5-2','第五號','固床工5'],
    title:'溪構5-2 維護重點',
    body:`溪構5-2（橫流溪固床工）維護重點與常見缺損：

位置：橫流溪中上游段，鄰近FD3/FD4魚道區域。

常見缺損：
• 壩頂面裂縫：因溫差與乾濕循環產生表面龜裂，深度<1cm屬輕微（D=1）
• 下游護坦沖刷：高流量期（>10 cms）溪床剪力超過設計值，護坦塊石位移
• 翼牆回填流失：側向滲流帶走細料，導致局部下陷（DER&U評分需現地確認）
• 魚道接口：固床工壩頂與魚道入口高差需維持設計值（±5cm容許誤差）

維護建議（依急迫性）：
1. 汛後每年10月：護坦石料補充、裂縫灌漿
2. 每季：目視巡查翼牆、量測固床工頂高程
3. 枯水期：機械清淤（若回淤深度>80cm）
4. 發現D≥3時立即通報並啟動應急修復程序

注意：進行任何清淤或修復作業前，需確認魚道正常通水，避免影響洄游魚類。` },

  { id:'maintenance_general', kw:['維護','修復','巡查','檢查','保養','清淤','裂縫','修繕'],
    title:'工程設施巡查與維護原則',
    body:`橫流溪工程設施巡查頻率與重點：

定期巡查（每季）：
• 全線8座魚道通水狀態、池格積砂
• 固床工護坦石料、壩頂裂縫、翼牆傾斜
• 濱溪植被覆蓋率（目標≥70%）

汛期前（3-4月）巡查重點：
• 魚道入口攔砂檢查（春季繁殖洄游期前確保暢通）
• 護坦塊石穩定性、消能跌水是否堵塞

汛後（10-11月）巡查重點：
• 回淤深度量測（固床工上游）
• 護坦沖刷、壩體位移
• AI攝影機鏡頭清潔與校正

緊急巡查觸發條件：
• 24小時累積雨量>100mm
• 流量超過10 cms（觸發高流量風險）
• 地震後（ML≥4.0）

DER&U評分記錄應在巡查後24小時內輸入系統。` },

  // ── 魚道監測 ──
  { id:'fishway_all', kw:['魚道','fd','fishway','通過','監測','辨識','偵測','8座'],
    title:'橫流溪8座魚道AI監測成果總覽',
    body:`橫流溪8座魚道AI辨識最大魚類數量（YOLOv4，1分鐘內最大值，尾）：

魚道     │ 型式            │ 112/10 │ 113/4 │ 113/9 │ 電捕(尾)
FD4      │ 階段式          │  52    │  68★  │  57   │  11
FD3      │ 粗石斜曲面      │  41    │  66   │  48   │   6
FD6      │ 階段式(半斷面)  │  23    │  31   │  27   │   4
FD1      │ 粗石斜曲面(1-1) │  18    │  22   │  15   │   5
FD8      │ 梯狀(階段)      │  14    │  19   │  16   │   5
FD2      │ 改良舟通式(1-2) │  12    │  16   │  11   │   8
FD5      │ 潛越式(階段)    │   9    │  14   │   8   │  17★
FD7      │ 降壩(上游階段)  │   7    │  11   │   9   │   7

★最多值。FD5電捕最多但AI偵測少，顯示夜間或底棲活動為主。
FD4為標竿魚道，水棲昆蟲最豐富（25科352隻）。` },

  { id:'fishway_fd4', kw:['fd4','階段式魚道','最多','標竿'],
    title:'FD4 階段式魚道詳細資料',
    body:`FD4 階段式魚道（0K+740）：
• AI辨識最大值：68尾/分鐘（113年4月）
• 電捕：11尾，多種混棲
• 水棲昆蟲：25科352隻（8樣區最多，FBI=3.63，水質極好）
• 濱溪植物遮蔭良好，水溫穩定

維護建議：
1. 每池格池深維持設計值（枯水期人工清砂）
2. 定期清除跌水面青苔（確保AI鏡頭辨識率）
3. 高流量後優先巡查底部消能塊石穩定度
4. 作為其他魚道改善的參考標竿，建立維護操作手冊` },

  { id:'fishway_fd5', kw:['fd5','潛越式','電捕最多','17尾','臺灣間爬岩鰍'],
    title:'FD5 潛越式魚道（含爬岩鰍記錄）',
    body:`FD5 潛越式魚道（0K+900）特殊性：
• AI偵測較少（14尾/分），但電捕最多（17尾，5種）
• 有臺灣間爬岩鰍記錄（本系統HECRAS-2D棲地模擬目標種）
• 顯示底棲魚種活動為主，AI水面攝影較難偵測

推測原因：
1. 潛越式設計水流貼底，魚類多在底層通過
2. 臺灣間爬岩鰍為底棲吸盤型，不易被水面攝影偵測
3. 可考慮在FD5加設底部攝影或聲納計數器

維護重點：
• 確保潛越口不被砂石堵塞（每季清理）
• 維持低流量時最小取水量（>0.003 cms）` },

  { id:'fishway_risk', kw:['風險','高流量','10cms','4%','斷流','低流量','沖刷','淤積'],
    title:'魚道水理風險評估（HECRAS-2D）',
    body:`橫流溪魚道水理風險評估結果（2021-2023年共26,280小時統計）：

高流量風險（Q > 10 cms）：
• 魚道內流速可能超過魚類極限泳速
• 發生率：4%（全年約1,051小時）
• 評估結論：風險可接受，但建議監測
• 建議：超過10 cms時，AI偵測數據僅供參考，不計入通過率統計

低流量風險（Q < 0.003 cms）：
• 改良型舟通式魚道（FD2）可能斷流
• 歷次量測：皆未低於此流量值
• 評估結論：風險極低

沖淤潛勢（50年重現期，Q=325 cms）：
• 魚道出口：有沖刷潛勢（降低未來堵塞機率）
• 下游固床工：有淤積潛勢（建議定期清淤）

管理對策：
1. 安裝流量感測器（若無），流量>8 cms時自動警示
2. 每年枯水期量測固床工上游淤積深度
3. 大洪水後48小時內完成魚道通水確認巡查` },

  // ── 生態資料 ──

  { id:'eco_overview', kw:['生態資料庫','生態','說明','資料庫','籠集','資料','生態系','概況','整體'],
    title:'橫流溪生態資料庫概況',
    body:`橫流溪生態資料庫（112-113年監測）涵蓋範圍：

【魚類】6種（臺灣白甲魚為優勢種）、電捕＋陷阱鐵籠雙法調查
【水棲昆蟲】8樣區、FBI水質全達「好」以上、5區達「極好」
【植物】38科91種，原生種佔67%，4種台灣特有種
【魚道監測】8座魚道、YOLOv4 AI辨識、每月1次夜間監測
【棲地模擬】HECRAS-2D二維水理模型、WUA棲地加權面積評估
【工程設施】0K+460至1K+400、DER&U健康評估系統

生態完整度：橫流溪屬低擾動山澗型溪流，FBI水質優良可支持纓口臺鰍（易危VU種）棲息，臺灣白甲魚族群穩定，是南投縣低海拔魚類多樣性保育重點溪段。` },

  { id:'taiwan_barbel', kw:['白甲魚','臺灣白甲魚','白甲','barbatulum','onychostoma','體長','身長','尺寸','大小','水域','流速','底質','棲地需求','魚道需求','適合','通道','洄游'],
    title:'臺灣白甲魚生態習性與魚道適合度',
    body:`臺灣白甲魚（Onychostoma barbatulum）生態資料：

【基本資料】
學名：Onychostoma barbatulum（鯉科 Cyprinidae）
保育等級：LC（無危，臺灣特有種）
體型：成魚體長 10～25 cm，一般個體 12～18 cm；電捕最大記錄約 22 cm
體色：側線銀白，背部灰綠，口下位（刮食型）

【棲地偏好】
• 水域類型：清澈、流動的山澗型溪流（含礫石、卵石底質）
• 水溫偏好：14～22 °C（耐低溫，夏季高溫>25°C時上移至上游庇護）
• 流速適宜：0.2～0.8 m/s（偏好中流速段，避開靜水與急流）
• 水深：0.1～0.6 m 淺流至中深度
• 底質：卵石、礫石混合，需有附生藻類（食物來源）
• 溶氧：需求高（>7 mg/L），水質敏感，FBI指標評估為「好」以上溪段

【食性與行為】
• 口下位，以角質化上顎刮食石面附生藻類（刮食者 Scrapers）
• 群聚性弱，單獨或小群活動
• 無長距離洄游習性，但季節性在溪段上下移動（繁殖期4-6月上移）

【橫流溪現況】
• 電捕最多12尾（改良舟通式），上下游（FD4~FD8段）皆有記錄
• AI辨識各站皆可見，FD4階段式魚道附近記錄較多

【魚道適合度評估】
需求：可通過中低坡降魚道（<5%），需有水深>10 cm 且流速<0.8 m/s 的池室
橫流溪8座魚道對應：
• FD1-FD3（粗石斜曲面式）：底質近天然，適合度★★★★★（最佳）
• FD4（階段式）：池室水深充足，流速可接受，適合度★★★★
• FD5（潛越式）：底部流速偏高，白甲魚通過率略低，適合度★★★
• FD6-FD8（半斷面/梯狀）：需確認低流量期>10 cm 水深，適合度★★★

【潛在問題】
低流量期（乾季）部分魚道水深不足10 cm → 白甲魚無法通過
建議：加裝水位感測器，當流量<0.5 cms 時發出預警，避免阻斷白甲魚季節性移動。` },

  { id:'fish_species', kw:['魚類','魚種','物種','電捕','纓口臺鰍','明潭吻','石魚賓','鬚鱲','鰕虎','保育','調查','多樣性'],
    title:'橫流溪魚類調查成果（112-113年）',
    body:`橫流溪112~113年魚類調查（電捕+陷阱鐵籠）：

共3科6種：
物種            │ 保育   │ 調查亮點
臺灣白甲魚      │ LC     │ 改良舟通式電捕最多(12尾)，上下游皆有
明潭吻鰕虎      │ LC     │ 陷阱法6尾，體長4.3~8.2cm
纓口臺鰍        │ VU ⚠   │ 陷阱法1尾，體長6.8cm（易危種，需追蹤）
臺灣石魚賓      │ NT     │ 多處記錄
短吻紅斑吻鰕虎  │ LC     │ 陷阱法1尾，體長5.2cm
臺灣鬚鱲        │ LC     │ AI辨識常見種

甲殼類：粗糙沼蝦（1種）

夏儂多樣性指數（H'）：壩上游最高1.68（112年5月）、113年最高1.54
保育重點：纓口臺鰍（VU）族群監測，建議每年確認至少1尾現蹤記錄。` },

  { id:'aquatic_insects', kw:['水棲昆蟲','fbi','水質','石蠅','蜉蝣','毛翅','刮食','捕食','採食'],
    title:'水棲昆蟲水質評估（113年4月）',
    body:`橫流溪8樣區水棲昆蟲FBI（Family Biotic Index）水質評估：

樣區 │ 對應魚道               │ FBI   │ 水質
A    │ 粗石斜曲面(1-1)+舟通式 │ 4.21  │ 好
B    │ 階段式(半斷面)          │ 4.85  │ 好
C    │ 粗石斜曲面式            │ 4.62  │ 好
D    │ 階段式魚道（FD4）       │ 3.63★ │ 極好（25科352隻）
E    │ 潛越式(階段)            │ 3.41  │ 極好
F    │ 階段式(半斷面)          │ 3.88  │ 極好
G    │ 降壩(上游階段)          │ 3.72  │ 極好
H    │ 梯狀(階段)魚道          │ 3.55  │ 極好

評估結論：8樣區全達「好」以上，D~H五區達「極好」
→ 橫流溪水質整體優良，可支持纓口臺鰍（VU）等敏感物種棲息
FBI < 4.0 = 極好 / 4.0-5.0 = 好 / 5.0-6.0 = 中 / >6.0 = 差` },

  { id:'habitat_wua', kw:['棲地','wua','hsi','臺灣間爬岩鰍','hecras','棲地適合度','淺流','緩流','深潭'],
    title:'棲地適合度分析（WUA/HSI，HECRAS-2D）',
    body:`橫流溪HECRAS-2D二維水理棲地模擬（目標物種：臺灣間爬岩鰍，流量1.0 cms）：

WUA（加權可用面積）佔比：
• 壩上游（st.1）：53.2%（54,886網格點）
• 壩下游（st.2）：44.2%（16,909網格點）

壩上游水域型態：淺流50%、緩流21%、深流12%、淺瀨13%、深潭4%
壩下游水域型態：淺流38%、緩流33%、深流13%、淺瀨10%、深潭5%

HSI計算：HSI = (水深適宜性 × 流速適宜性 × 底質適宜性)^(1/3)
  水深適宜區間：0.1~0.5m（臺灣間爬岩鰍偏好）
  流速適宜區間：0.1~0.6 m/s
  底質偏好：卵石與礫石混合基底

評估結論：「棲地條件無問題」
• 上游WUA>50%，棲地多元豐富
• 下游雖WUA略低，但緩流比例高（33%），適合底棲避難
• 兩岸緩流帶可作為低流量期庇護所` },

  { id:'plants', kw:['植物','植被','濱溪','原生種','特有種','歸化','科','種'],
    title:'橫流溪濱溪植物調查',
    body:`橫流溪豐林橋上下游400m植物調查（112年6月）：

統計：38科、91種
  原生種：61種（佔67%）
  歸化種：30種
  特有種：4種
  栽培種：若干

生態意義：
• 原生種佔比高（67%），反映自然恢復良好
• 特有種保育：4種台灣特有植物，集中於較少人為干擾的中上游段
• 歸化種監控：需防範入侵種擴散（如香澤蘭、銀合歡）

與水棲昆蟲關係：
• FD4周邊濱溪植物覆蓋佳，微棲地豐富
• 根團結構提供水棲昆蟲附著基質（FD3粗石斜曲面根團微棲地佳）
• 植物落葉提供碎食性(Sh.撕裂者)昆蟲食物來源` },

  // ── AI辨識系統 ──
  { id:'ai_system', kw:['yolo','yolov4','ai','辨識','準確率','map','精確率','召回率','訓練','深度學習'],
    title:'YOLOv4 智慧辨識系統技術說明',
    body:`橫流溪魚道YOLOv4智慧辨識系統（國立臺灣大學執行）：

模型性能：
日間模式：mAP = 85.42%，精確率71%，召回率82%
  TP=1,543 / FP=624 / FN=343
  訓練集：13,232張 / 測試集：1,340張

夜間模式：mAP = 81.37%，精確率85%，召回率62%
  TP=1,885 / FP=333 / FN=1,137
  訓練集：17,502張 / 測試集：1,215張
  （夜間FN偏高=召回率低，主因：低光下魚體輪廓模糊）

標記總影像：18,717張（含6種魚類標記）

演算法比較（同資料集）：
YOLOv4: 85.42% > YOLOv5: 82.1% > YOLOv9t: 78.6% > YOLOv11n: 76.3%

辨識類別（6種）：臺灣白甲魚、臺灣石魚賓、臺灣鬚鱲、鰕虎科、爬鰍科、其他底棲

後續優化建議：
1. 擴充夜間訓練集（目前FN偏多），目標夜間召回率>75%
2. 加入臺灣間爬岩鰍訓練類別（目前歸入爬鰍科）
3. 結合聲學感測器提升底棲魚種偵測率` },

  // ── 管理建議 ──
  { id:'mgmt_priority', kw:['管理','建議','優先','整合','策略','計畫','改善','短期','中期','長期'],
    title:'橫流溪整合管理建議',
    body:`橫流溪水域友善管理整合建議（基於112-113年監測成果）：

立即（3個月內）：
• FD5潛越式魚道加裝底層計數器（補充AI偵測盲點）
• 各魚道季節監測排程：以4月（春繁殖期）為年度關鍵調查月

短期（6個月）：
• 建立FD4標竿魚道維護操作手冊
• 纓口臺鰍（VU）陷阱調查→每半年確認族群現況
• FD7降壩周邊根團微棲地強化（臺灣間爬岩鰍已現蹤）

中期（1-2年）：
• 4台AI攝影機軟體升級，加入臺灣間爬岩鰍辨識類別
• 固床工上游定期水深/回淤量測（建立基線資料）
• 濱溪植物歸化種移除計畫（優先處理入侵最快的樣區）

長期（3-5年）：
• 8座魚道通過率趨勢分析→評估是否需要結構改善
• 臺灣白甲魚族群數量追蹤（目前LC，但需監測長期趨勢）
• 整合DER&U評分與生態指標，建立設施-生態健康指數` },

  { id:'seasonal_ecology', kw:['季節','春','夏','秋','冬','洄游','繁殖','產卵','時程'],
    title:'橫流溪魚類季節性監測模式',
    body:`橫流溪3次AI辨識監測趨勢：

時期     │ 特徵                     │ 代表種高峰
112年10月 │ 秋季降雨後溪流恢復        │ 鰕虎科（底棲穩定）
113年4月  │ ★全體最高（春繁殖期）    │ 臺灣白甲魚218、臺灣鬚鱲175
113年9月  │ 夏末水量較穩、物種多樣   │ 臺灣白甲魚196（次高）

為什麼4月最高：
1. 臺灣白甲魚3-5月繁殖洄游，大量個體向上游移動
2. 春雨提供充足流量，魚道水位適宜
3. 水溫回升（15-22°C），魚類活動力增強
4. 冬季累積的魚類已在春季上游集結

維護時程建議：
• 3月底前：完成魚道清淤、確保入口暢通（繁殖洄游前）
• 4月：重點AI監測月（記錄繁殖洄游事件）
• 10月：汛後巡查+清淤（確保冬季基流期魚道通水）` }
];

// ── 關鍵字評分引擎 ──────────────────────────────────────
function normalizeQuery(q) {
  return q.toLowerCase()
    // 將常見縮寫符號移除，讓 "DER&U" → "deru"、"FD-4" → "fd4"
    .replace(/[&\-+\/#_]/g, '')
    .replace(/[，。！？、\s]+/g, ' ')
    .trim();
}

function scoreKBEntry(entry, queryTokens) {
  let score = 0;
  // qText：移除特殊符號後的查詢全文（用於關鍵字比對）
  const qText = queryTokens.join('');
  // qNorm：對 entry title 也做相同正規化，讓大小寫不影響
  const qOrig = queryTokens.join(' ');

  entry.kw.forEach(k => {
    const kNorm = normalizeQuery(k);
    if (qText.includes(kNorm)) {
      score += (k.length > 2 ? 3 : 1);
      // title 加權：只有當 keyword 已在 query 中命中，才額外加分
      if (entry.title.toLowerCase().replace(/[&\-+\/#_]/g,'').includes(kNorm)) {
        score += 1;
      }
    }
  });
  return score;
}

function tokenize(query) {
  const norm = normalizeQuery(query);
  return norm.replace(/[，。！？、\s]+/g, ' ').split(' ').filter(Boolean);
}

// ── 動態資料檢索（從已載入的 JS 全域資料）──────────────
/* ══════════════════════════════════════════════════════════
   buildDynamicContext — 從 DB 擷取相關資料注入 AI 問答上下文
   版本 2.0：全面整合設施、巡查、DER&U、魚類、統計資料
   ══════════════════════════════════════════════════════════ */
function buildDynamicContext(query) {
  const q = query.toLowerCase();
  const parts = [];

  // ── A. MONITORING_REPORT（chapter4_ecology.js）──────────
  if (typeof MONITORING_REPORT !== 'undefined') {
    const mr = MONITORING_REPORT;

    // 魚道 AI 辨識監測（含構造物名稱與公里位置）
    const isFDQuery = q.match(/fd[0-9]|魚道[1-9]|第[一二三四五六七八]|監測|辨識.*魚|魚.*辨識/);
    if (isFDQuery) {
      // 特定 FD 查詢
      const specificFDs = mr.fishwayAIDetection.filter(fd =>
        q.includes(fd.id.toLowerCase()) ||
        (fd.structure && q.includes(fd.structure.substring(0,4))) ||
        q.includes(fd.name.substring(0, 3))
      );
      const targetFDs = specificFDs.length > 0 ? specificFDs : mr.fishwayAIDetection;
      targetFDs.forEach(fd => {
        const structureInfo = fd.structure ? `【${fd.structure}，位於 ${fd.km}】` : '';
        parts.push(
          `${fd.id}（${fd.name}）${structureInfo}` +
          `：112年10月=${fd.max112Oct}尾、113年4月=${fd.max113Apr}尾（峰值）、113年9月=${fd.max113Sep}尾` +
          (fd.note ? `。備註：${fd.note}` : '')
        );
      });
      // 若查詢所有魚道，補充全覽說明
      if (specificFDs.length === 0) {
        parts.push('【魚道區位說明】FD編號由下游向上游排列：FD8(0K+460)→FD7(0K+560)→FD6(0K+740)→FD5(1K+000)→FD4(1K+170)→FD3(1K+225)→FD2/FD1(1K+400)');
      }
    }

    if (q.includes('wua') || q.includes('棲地') || q.includes('間爬岩鰍')) {
      const ha = mr.habitatAssessment;
      parts.push(`棲地適合度（WUA）：上游${ha.upstreamWUA}%（${ha.upstreamPoints}點）、下游${ha.downstreamWUA}%（${ha.downstreamPoints}點）。目標物種：${ha.targetSpecies}。`);
    }
    if (q.includes('yolo') || q.includes('map') || q.includes('辨識') || q.includes('ai模型')) {
      const am = mr.aiModel;
      parts.push(`YOLOv4模型：日間mAP=${am.dayMAP}%（精確率${(am.dayPrecision*100).toFixed(0)}%、召回率${(am.dayRecall*100).toFixed(0)}%），夜間mAP=${am.nightMAP}%（精確率${(am.nightPrecision*100).toFixed(0)}%、召回率${(am.nightRecall*100).toFixed(0)}%）。`);
    }
  }

  if (typeof DB === 'undefined') return parts.join('\n');

  try {
    const facilities   = DB.getAll('facilities')   || [];
    const inspections  = DB.getAll('inspections')  || [];
    const fishRecords  = DB.getAll('fish')          || [];

    // ── B. 設施資料（精準比對名稱/代碼/類型）───────────────
    const isGeneralFacQuery = q.includes('設施') || q.includes('構造物') || q.includes('工程') || q.includes('維護');
    const facMatches = facilities.filter(f => {
      const txt = `${f.name||''} ${f.code||''} ${f.type||''} ${f.subType||''} ${f.location||''}`.toLowerCase();
      return txt.split(' ').some(token => token && q.includes(token)) ||
             (f.type && q.includes(f.type)) ||
             (f.name && q.split(/\s+/).some(w => w.length > 1 && (f.name.includes(w) || (f.code && f.code.includes(w)))));
    });

    // 若查詢關鍵字涉及統計摘要
    if (isGeneralFacQuery && facMatches.length === 0) {
      const byType = {};
      facilities.forEach(f => { byType[f.type||'其他'] = (byType[f.type||'其他']||0)+1; });
      const typeStr = Object.entries(byType).map(([t,n]) => `${t}${n}座`).join('、');
      const needMaint = facilities.filter(f => f.status === '需維護' || f.status === '損壞').length;
      parts.push(`【設施總覽】共${facilities.length}座工程構造物（${typeStr}）。需維護/損壞：${needMaint}座。`);
    }

    facMatches.slice(0, 4).forEach(f => {
      const hp = f.condition ? `健康指數約${Math.round(f.condition*20)}分` : '';
      const deruStr = f.derLevel ? `DER&U等級 ${f.derLevel}` : '';
      const riskStr = f.riskScore ? `風險分數 ${f.riskScore}` : '';
      const noteStr = f.evaluationNotes ? `評估備註：${f.evaluationNotes}` : '';
      const inspDate = f.lastInspect ? `最近巡查：${f.lastInspect}` : '未巡查';
      const strategy = f.maintenanceStrategy ? `維護策略：${f.maintenanceStrategy}` : '';
      parts.push([
        `【設施】${f.name}（${f.type||''}${f.subType?'/'+f.subType:''}，代號${f.code||'-'}）`,
        `位置：${f.stationKm||f.location||'-'}，TWD97(${f.twd97x||'-'},${f.twd97y||'-'})`,
        `狀態：${f.status||'未知'}，${hp}，${deruStr}，${riskStr}`,
        `材料：${f.material||'-'}，建造年：${f.year||'-'}`,
        `${inspDate}，${strategy}`,
        noteStr,
        f.judgement_basis ? `判斷依據：${f.judgement_basis}` : '',
        f.note ? `備註：${f.note}` : ''
      ].filter(Boolean).join('\n  '));
    });

    // ── C. 巡查紀錄（最近相關紀錄）───────────────────────
    const isInspQuery = q.includes('巡查') || q.includes('檢查') || q.includes('紀錄') ||
                        q.includes('異常') || q.includes('問題') || q.includes('發現');
    const facIds = new Set(facMatches.map(f => String(f.id)));

    let inspMatches = inspections.filter(r => {
      const rFacId = String(r.facilityId || r.facility_id || '');
      const rText  = `${r.facilityName||''} ${r.findings||''} ${r.action||''}`.toLowerCase();
      return facIds.has(rFacId) ||
             (isInspQuery && (q.split(/\s+/).some(w => w.length > 1 && rText.includes(w))));
    }).sort((a, b) => String(b.date||'').localeCompare(String(a.date||'')));

    // 一般查詢：如果沒有特定設施，取最近3筆異常/高優先
    if (inspMatches.length === 0 && isInspQuery) {
      inspMatches = inspections
        .filter(r => r.priority === '高' || r.priority === '緊急' || r.status === '待處理')
        .sort((a, b) => String(b.date||'').localeCompare(String(a.date||''))).slice(0, 3);
    }

    inspMatches.slice(0, 3).forEach(r => {
      const typeLabel = r.type === 'deru_assessment' ? 'DER&U評估' : (r.sourceType || r.type || '巡查');
      const deruStr = r.deru_d !== undefined ? ` D${r.deru_d}/E${r.deru_e}/R${r.deru_r} U${r.deru_u}(${r.deru_label||''})` : '';
      parts.push([
        `【巡查紀錄】${r.facilityName||r.facility_name||''}｜${typeLabel}`,
        `日期：${r.date||'-'}，巡查員：${r.inspector||'-'}，天氣：${r.weather||'-'}`,
        `狀態：${r.status||'-'}，優先度：${r.priority||'-'}${deruStr}`,
        r.findings ? `發現：${r.findings}` : '',
        r.action   ? `建議：${r.action}`   : ''
      ].filter(Boolean).join('\n  '));
    });

    // ── D. 魚類調查資料 ────────────────────────────────────
    const isFishQuery = q.includes('魚') || q.includes('生態') || q.includes('物種') ||
                        q.includes('保育') || q.includes('調查') || q.includes('尾數');
    if (isFishQuery && fishRecords.length) {
      const fishMatches = fishRecords.filter(r => {
        const txt = `${r.chineseName||r.species||''} ${r.family||''} ${r.conservationStatus||''}`.toLowerCase();
        return q.split(/\s+/).some(w => w.length > 1 && txt.includes(w)) ||
               q.includes(r.chineseName||'') || q.includes(r.species||'');
      });
      if (fishMatches.length === 0 && q.includes('魚')) {
        // 摘要統計
        const total = fishRecords.reduce((s, r) => s + (Number(r.totalCount)||0), 0);
        const protected_ = fishRecords.filter(r => r.conservationStatus && r.conservationStatus !== '一般').length;
        parts.push(`【魚類資料庫】共記錄${fishRecords.length}種魚類，合計${total}尾次，保育類${protected_}種。`);
      }
      fishMatches.slice(0, 3).forEach(r => {
        parts.push([
          `【魚類】${r.chineseName||r.species||''}（${r.latinName||r.species_latin||''}，${r.family||''}）`,
          `保育等級：${r.conservationStatus||'一般'}，總數量：${r.totalCount||'-'}尾次`,
          `棲地需求：${r.habitatRequirements||r.notes||'-'}`,
          r.surveys ? `調查紀錄：${r.surveys}筆` : ''
        ].filter(Boolean).join('\n  '));
      });
    }

    // ── E. DER&U 整體摘要（當問到評估/評分/維護優先）──────
    const isDeruQuery = q.includes('deru') || q.includes('評估') || q.includes('急迫') ||
                        q.includes('ics') || q.includes('優先') || q.includes('風險');
    if (isDeruQuery) {
      const withDeru = facilities.filter(f => f.derLevel);
      const urgent   = withDeru.filter(f => f.derLevel && /C|D/.test(f.derLevel)).length;
      const avgRisk  = withDeru.length ? Math.round(withDeru.reduce((s,f)=>s+(f.riskScore||0),0)/withDeru.length) : 0;
      parts.push(`【DER&U摘要】${withDeru.length}座設施已評估，緊急/嚴重等級${urgent}座，平均風險分${avgRisk}。`);
      // 列出最高風險設施
      withDeru.sort((a,b)=>(b.riskScore||0)-(a.riskScore||0)).slice(0,3).forEach(f => {
        parts.push(`  高風險：${f.name}（${f.derLevel}，分數${f.riskScore}，策略：${f.maintenanceStrategy||'-'}）`);
      });
    }

  } catch(e) {
    console.warn('[buildDynamicContext] DB 查詢錯誤:', e.message);
  }

  return parts.join('\n');
}

// ── 本機知識庫查詢主函數 ───────────────────────────────
function queryLocalKB(query) {
  const tokens = tokenize(query);
  const qText = query.toLowerCase();

  // 1. 靜態 KB 評分排序（至少要有 2 分才列入，避免零分噪音）
  const scored = HLX_KB.map(entry => ({
    entry,
    score: scoreKBEntry(entry, tokens)
  })).filter(x => x.score >= 2).sort((a, b) => b.score - a.score);

  // 2. 動態資料補充
  const dynamicCtx = buildDynamicContext(query);

  // 3. 組合回答
  const topEntries = scored.slice(0, 3);

  let answer = '';
  let citations = [];
  let confidence_level = 'low';
  let confidence_score = 30;

  if (topEntries.length >= 2) {
    confidence_level = 'high';
    confidence_score = 85;
  } else if (topEntries.length === 1) {
    confidence_level = 'medium';
    confidence_score = 65;
  }

  if (topEntries.length > 0) {
    // 主答案：最高分條目
    const main = topEntries[0].entry;
    answer = main.body;

    // 若有動態資料，附加在前
    if (dynamicCtx) {
      answer = `【即時資料庫查詢】\n${dynamicCtx}\n\n【知識庫參考】\n${answer}`;
    }

    // Citations
    citations = topEntries.map((x, i) => ({
      index: i + 1,
      source_file: x.entry.source || '橫流溪工程設施管理平台',
      page: 1,
      score: Math.max(0.5, Math.min(1.0, x.score / 10)),
      preview: x.entry.title,
      source_href: ''
    }));
  } else if (dynamicCtx) {
    // 只有動態資料
    answer = `【即時資料庫查詢】\n${dynamicCtx}`;
    confidence_level = 'medium';
    confidence_score = 60;
    citations = [{ index: 1, source_file: '橫流溪管理資料庫（即時）', page: 1, score: 0.6, preview: '動態查詢結果', source_href: '' }];
  } else {
    // 完全找不到
    answer = '';
    confidence_level = 'none';
    confidence_score = 0;
  }

  return {
    answer,
    sources: citations,
    structured_citations: citations,
    confidence_level,
    confidence_score,
    policy_label: confidence_level === 'high' ? '高信心' : confidence_level === 'medium' ? '中信心' : confidence_level === 'none' ? '無依據' : '低信心',
    message: confidence_level === 'none'
      ? '本機知識庫中未找到匹配內容，請補充更具體的查詢關鍵字。'
      : `本機知識庫即時回答（${topEntries.length}條相關資料）`,
    llm_provider: 'local_kb',
    llm_model: '橫流溪知識庫 v1.0',
    recommendations: confidence_level === 'none'
      ? [
          '📋 可詢問的主題（直接複製貼上）：',
          '「溪構11 目前狀況與維護建議」',
          '「哪些設施風險最高需優先處理？」',
          '「平台近期有異常巡查紀錄嗎？」',
          '「魚道 DER&U 評估等級彙整」',
          '「臺灣白甲魚調查數量與棲地需求」',
          '「纓口臺鰍保育現況」、「FD4魚道監測成果」',
          '「WUA棲地適合度分析」、「YOLOv4辨識準確率」',
          '「DER&U評估方法」、「ICS急迫性指標計算」'
        ]
      : []
  };
}

// ═══════════════════════════════════════════════════════
//  RAG + Ollama AI chat widget.
// ═══════════════════════════════════════════════════════
function initAIChat() {
  if (document.getElementById("aiChatWidget")) return;

  const style = document.createElement("style");
  style.id = "aiChatStyle";
  style.textContent = `
    #aiChatWidget{position:fixed;bottom:24px;right:24px;z-index:1000;font-family:'Microsoft JhengHei',sans-serif}
    #aiChatBtn{width:52px;height:52px;border-radius:50%;background:var(--primary);color:#fff;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.2);font-size:18px;font-weight:700}
    #aiChatPanel{display:none;width:440px;height:640px;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.18);flex-direction:column;overflow:hidden;margin-bottom:10px}
    #aiChatPanel.open{display:flex}
    .ai-header{background:var(--primary);color:#fff;padding:10px 14px;display:flex;align-items:center;justify-content:space-between}
    .ai-title{font-weight:700;font-size:14px}
    .ai-sub{font-size:11px;opacity:.9}
    .ai-header-close{background:none;border:none;color:#fff;cursor:pointer;font-size:18px;padding:2px 6px;border-radius:4px}
    .ai-header-close:hover{background:rgba(255,255,255,.2)}
    .ai-messages{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px;background:#f8fafc}
    .ai-msg{max-width:96%;font-size:13px;line-height:1.45;white-space:pre-wrap}
    .ai-msg.bot{background:#fff;border:1px solid #e2e8f0;border-radius:0 10px 10px 10px;padding:9px 11px;align-self:flex-start}
    .ai-msg.user{background:var(--primary);color:#fff;border-radius:10px 0 10px 10px;padding:8px 12px;align-self:flex-end}
    .ai-input-row{display:flex;gap:6px;padding:10px 12px;border-top:1px solid #e2e8f0;background:#fff}
    .ai-input{flex:1;padding:8px 10px;border:1px solid #d5dde7;border-radius:20px;font-size:13px;outline:none;font-family:inherit}
    .ai-input:focus{border-color:var(--primary)}
    .ai-send{background:var(--primary);color:#fff;border:none;border-radius:18px;min-width:48px;height:34px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .ai-send:hover{background:var(--primary-light)}
    .ai-typing{display:flex;gap:4px;padding:8px 12px;background:#fff;border:1px solid #e2e8f0;border-radius:0 10px 10px 10px;align-self:flex-start}
    .ai-typing span{width:8px;height:8px;border-radius:50%;background:#1a6b3c;animation:bounce .9s infinite}
    .ai-typing span:nth-child(2){animation-delay:.15s}
    .ai-typing span:nth-child(3){animation-delay:.3s}
    .ai-confidence-badge{display:flex;align-items:center;gap:8px;border-radius:8px;padding:9px 10px;margin-bottom:10px;font-size:13px;font-weight:600}
    .ai-confidence-badge.high{background:#e8f5e9;border-left:4px solid #2e7d32;color:#1b5e20}
    .ai-confidence-badge.medium{background:#fff8e1;border-left:4px solid #f57f17;color:#8a5a00}
    .ai-confidence-badge.low{background:#ffebee;border-left:4px solid #c62828;color:#b71c1c}
    .ai-confidence-badge.none{background:#f3f3f3;border-left:4px solid #616161;color:#424242}
    .ai-confidence-text{flex:1}
    .ai-confidence-score{font-weight:700;font-size:12px;background:rgba(255,255,255,.65);padding:2px 6px;border-radius:4px}
    .ai-section-title{font-weight:700;margin:7px 0 3px;color:#1f2937}
    .ai-answer{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:8px 9px;color:#243447;line-height:1.55;white-space:pre-wrap;font-size:12.5px}
    .ai-answer br{line-height:1.1}
    .ai-model-note{font-size:11px;color:#64748b;margin-bottom:4px}
    .ai-recommendations{background:#f9fafb;border-left:3px solid #e5e7eb;padding:8px;margin-top:6px;border-radius:4px;font-size:12px;color:#475569}
    .ai-recommendations li{margin-left:16px;margin-top:2px}
    .ai-citations{margin-top:8px;border-top:1px dashed #d8dee8;padding-top:6px}
    .ai-citation{border:1px solid #e5e7eb;border-radius:8px;padding:8px;margin-top:6px;background:#fafafa}
    .ai-citation-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;font-size:12px;font-weight:700;color:#334155}
    .ai-citation-preview{font-size:12px;color:#475569;margin-top:5px;white-space:pre-wrap}
    .ai-citation-link{font-size:12px;color:#155eef;text-decoration:none;white-space:nowrap}
    .ai-citation-link:hover{text-decoration:underline}
    .ai-feedback-section,.ai-feedback-prompt,.ai-feedback-buttons,.ai-feedback-btn,
    .ai-feedback-comment,.ai-feedback-submit,.ai-feedback-confirmation{display:none!important}
    @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
  `;
  document.head.appendChild(style);

  const widget = document.createElement("div");
  widget.id = "aiChatWidget";
  widget.innerHTML = `
    <div id="aiChatPanel">
      <div class="ai-header">
        <div>
          <div class="ai-title">橫流溪 AI 問答</div>
          <div class="ai-sub" id="aiSubLabel">本機知識庫 + RAG 即時檢索</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <button onclick="aiSetKey()" title="設定 Gemini API Key"
            style="background:rgba(255,255,255,0.2);border:none;color:#fff;border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer">🔑 Key</button>
          <button class="ai-header-close" onclick="toggleAIChat()">×</button>
        </div>
      </div>
      <div class="ai-messages" id="aiMessages">
        <div class="ai-msg bot" id="aiWelcomeMsg" style="white-space:pre-wrap">載入中…</div>
      </div>
      <div class="ai-input-row">
        <input class="ai-input" id="aiInput" placeholder="例如：溪構11 目前狀況如何？" onkeydown="if(event.key==='Enter')aiSend()">
        <button class="ai-send" onclick="aiSend()">送出</button>
      </div>
    </div>
    <button id="aiChatBtn" onclick="toggleAIChat()" title="橫流溪 AI 問答">AI</button>
  `;
  document.body.appendChild(widget);
}

function _buildWelcomeMessage() {
  let stats = { fac: 0, needMaint: 0, insp: 0, fish: 0, fishProtected: 0, urgentFac: [] };
  try {
    const facilities  = (typeof DB !== 'undefined') ? DB.getAll('facilities')  || [] : [];
    const inspections = (typeof DB !== 'undefined') ? DB.getAll('inspections') || [] : [];
    const fishRecords = (typeof DB !== 'undefined') ? DB.getAll('fish')        || [] : [];
    stats.fac       = facilities.length;
    stats.needMaint = facilities.filter(f => f.status === '需維護' || f.status === '損壞').length;
    stats.insp      = inspections.length;
    stats.fish      = fishRecords.length;
    stats.fishProtected = fishRecords.filter(r => r.conservationStatus && r.conservationStatus !== '一般').length;
    stats.urgentFac = facilities
      .filter(f => f.riskScore >= 50 || f.status === '損壞' || (f.derLevel && /C|D/.test(f.derLevel)))
      .sort((a,b)=>(b.riskScore||0)-(a.riskScore||0))
      .slice(0,2).map(f => f.name);
  } catch(e) {}

  const urgentLine = stats.urgentFac.length
    ? `\n⚠️ 高風險設施：${stats.urgentFac.join('、')}` : '';

  return `您好！我是<b>橫流溪管理平台 AI 助理</b>，可直接查詢資料庫即時資料。

📊 目前資料庫概況：
• 工程設施 ${stats.fac} 座，需維護 ${stats.needMaint} 座${urgentLine}
• 巡查紀錄 ${stats.insp} 筆，魚類記錄 ${stats.fish} 種（保育類 ${stats.fishProtected} 種）

💬 試試看以下問題：
• 「溪構11 目前狀況與維護建議」
• 「哪些設施風險最高需優先處理？」
• 「平台近期有異常紀錄嗎？」
• 「臺灣白甲魚調查數量與棲地需求」
• 「魚道 DER&U 評估等級彙整」
• 「巡查發現哪些異常問題？」
• 「WUA 棲地適合度分析結果」`;
}

function toggleAIChat() {
  const panel = document.getElementById("aiChatPanel");
  panel.classList.toggle("open");
  _updateAiSubLabel();
  // 首次開啟時動態填入歡迎訊息
  const welcome = document.getElementById("aiWelcomeMsg");
  if (welcome && welcome.textContent === '載入中…') {
    welcome.innerHTML = _buildWelcomeMessage();
  }
}

function _updateAiSubLabel() {
  const sub = document.getElementById("aiSubLabel");
  if (!sub) return;
  const key = getAIKey();
  sub.textContent = key ? "Groq AI + 本機知識庫" : "本機知識庫（未設定 Groq Key）";
}

function aiSetKey() {
  const current = getAIKey();
  const input = prompt(
    "請輸入 Groq API Key（從 console.groq.com → API Keys 取得，gsk_ 開頭）：\n儲存後即可使用 AI 回答，不需啟動後端伺服器。",
    current
  );
  if (input === null) return; // 使用者按取消
  if (input.trim()) {
    localStorage.setItem("GROQ_API_KEY", input.trim());
    _updateAiSubLabel();
    alert("✅ Gemini API Key 已儲存！下次問問題即可使用 AI 回答。");
  } else {
    localStorage.removeItem("GROQ_API_KEY");
    _updateAiSubLabel();
    alert("已清除 API Key，切換回本機知識庫模式。");
  }
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanText(text) {
  return String(text || "")
    .replace(/\uFFFD/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function appendAIMsg(content, role, asHtml = false) {
  const div = document.createElement("div");
  div.className = `ai-msg ${role}`;
  if (asHtml) div.innerHTML = content || "";
  else div.textContent = content || "";
  const msgs = document.getElementById("aiMessages");
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function appendTyping() {
  const div = document.createElement("div");
  div.className = "ai-typing";
  div.innerHTML = "<span></span><span></span><span></span>";
  const msgs = document.getElementById("aiMessages");
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function policyClass(level) {
  if (level === "high") return "high";
  if (level === "medium") return "medium";
  if (level === "low") return "low";
  return "none";
}

function getConfidenceIcon(level) {
  return ({ high: "✓", medium: "!", low: "!", none: "×" })[level] || "i";
}

function fallbackConfidence(citations) {
  if (!citations.length) {
    return {
      level: "none",
      score: 0,
      label: "無依據拒答",
      message: "文檔中未找到相關信息",
      action: "REJECT_AND_GUIDE",
      recommendations: ["請補充更明確的設施名稱、日期或報告名稱", "例如：溪構11、魚道維護、平台設施、棲地二維模式"]
    };
  }

  const scores = citations.map(c => Number(c.score || 0));
  const sorted = [...scores].sort((a, b) => b - a);
  const top = sorted[0] || 0;
  const avg = sorted.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(sorted.length, 3);
  const score = Math.round(Math.min(100, Math.max(0, (top * 0.7 + avg * 0.3) * 100)));
  if (top >= 0.75) return { level: "high", score, label: "高信心", message: "檢索結果可支持回答", action: "ACCEPT", recommendations: [] };
  if (top >= 0.60) return { level: "medium", score, label: "中信心", message: "建議對照原始文件確認細節", action: "VERIFY", recommendations: [] };
  return { level: "low", score, label: "低信心", message: "檢索相似度偏低，建議人工確認", action: "MANUAL_CHECK", recommendations: [] };
}

function collectCitations(data) {
  const apiBase = data?._apiBase || "";
  const raw = Array.isArray(data?.structured_citations) && data.structured_citations.length
    ? data.structured_citations
    : (Array.isArray(data?.sources) ? data.sources : []);
  return raw.slice(0, 4).map((c, index) => {
    const href = c.source_href || (c.source_path ? `/api/rag/document?source_path=${encodeURIComponent(c.source_path)}&page=${c.page || c.page_number || 1}` : "");
    return {
      index: c.index || index + 1,
      source_file: c.source_file || "文件",
      page: c.page || c.page_number || 1,
      score: Number(c.score || 0),
      preview: cleanText(c.preview || c.text || ""),
      source_href: href.startsWith("http") ? href : `${apiBase}${href}`
    };
  });
}

function renderFeedbackBlock() {
  return ''; // 回饋區塊已停用
}

function composeAnswer(query, data) {
  const citations = collectCitations(data);
  const fallback = fallbackConfidence(citations);
  const level = data?.confidence_level || fallback.level;
  const label = data?.policy_label || fallback.label;
  const message = data?.message || fallback.message;
  const answerPolicy = data?.answer_policy || fallback.action;
  const score = Number(data?.confidence_score ?? fallback.score);
  const recommendations = Array.isArray(data?.recommendations) ? data.recommendations : fallback.recommendations;
  const answer = cleanText(data?.answer || "");
  // llm_model 已由後端直接給出友善名稱（如 "llama-3.3-70b (Groq)"）
  const llmLabel = data?.llm_model || (
    data?.llm_provider === "local_kb" ? "本機知識庫" : "AI 推論"
  );

  const recsHtml = recommendations.length
    ? `<ul class="ai-recommendations">${recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`
    : "";

  // 有 Ollama 實際答案 → 不因為缺乏本機引用就走「找不到資料」分支
  const hasRealAnswer = answer.length > 20;

  // 找不到資料且無 Ollama 答案時，顯示簡單提示
  if ((!citations.length && !hasRealAnswer) || answerPolicy === "refuse" || answerPolicy === "REJECT_AND_GUIDE") {
    return `
      <div class="ai-answer">${escapeHtml(answer || "目前找不到相關資料，請換個關鍵字再試。")}</div>
      ${recsHtml}
      ${renderFeedbackBlock()}
    `;
  }

  const fallbackText = citations.slice(0, 3).map((c, idx) => {
    const text = c.preview || "檢索片段可作為分析依據，但仍建議回查原文確認。";
    return `${idx + 1}. ${escapeHtml(text)}`;
  }).join("<br>");

  // 網路來源區塊（smart-ask 模式才有）
  const webSources = Array.isArray(data?.web_sources) ? data.web_sources : [];
  const webSourcesHtml = webSources.length
    ? `<div style="margin-top:14px;padding-top:10px;border-top:1px solid #e2e8f0">
         <div style="font-size:12px;color:#94a3b8;margin-bottom:6px">
           <i class="fas fa-globe" style="margin-right:4px"></i>網路參考來源
         </div>
         <div style="display:flex;flex-direction:column;gap:5px">
           ${webSources.map(s => `
             <div style="font-size:12px;padding:5px 8px;background:#f8fafc;border-left:2px solid #bae6fd;border-radius:3px">
               <a href="${escapeHtml(s.href || '#')}" target="_blank" rel="noopener noreferrer"
                  style="color:#0369a1;font-weight:600;text-decoration:none">${escapeHtml(s.title || s.href || '')}</a>
             </div>`).join('')}
         </div>
       </div>`
    : "";

  const providerNote = llmLabel && llmLabel !== "本機知識庫"
    ? `<div style="font-size:11px;color:#94a3b8;margin-top:10px;text-align:right">
         <i class="fas fa-robot" style="margin-right:3px"></i>${escapeHtml(llmLabel)}
       </div>`
    : "";

  return `
    <div class="ai-answer">${answer ? escapeHtml(answer) : fallbackText}</div>
    ${webSourcesHtml}
    ${providerNote}
    ${renderFeedbackBlock()}
  `;
}

// ── 直接從瀏覽器呼叫 Groq API（免費、快速、不需後端）──────────────
const AI_SYSTEM = `你是「橫流溪管理平台」的專屬 AI 助理，使用繁體中文回答，擅長工程維護、生態保育與設施管理。

【核心規則】
1. 若【橫流溪本機資料】中有相關資訊，必須優先引用並明確說明來源（如「根據資料庫紀錄…」）。
2. 回答需結合資料庫實際數值（設施狀態、DER&U等級、巡查發現、魚類調查數量等），不得憑空捏造數字。
3. 若資料庫無相關資料，誠實說明「目前資料庫無此紀錄」，再提供一般專業知識補充。
4. 回答清晰自然、適當分段（可用換行與數字列點），不使用 Markdown 標題符號（#、##）。
5. 回答長度 150～400 字，簡潔有據。`;

function getAIKey() {
  return localStorage.getItem("GROQ_API_KEY") || "";
}

async function callGroqDirect(query, localCtx = "") {
  const key = getAIKey();
  if (!key) return null;

  // 同時注入即時 DB 資料（不受靜態 KB 限制）
  const dbCtx = buildDynamicContext(query);
  const combined = [localCtx, dbCtx].filter(Boolean).join('\n\n');
  const ctxBlock = combined
    ? `\n【橫流溪本機資料庫（即時查詢）】\n${combined}\n\n請優先依上述資料回答，資料不足時再補充專業知識。\n`
    : "";
  const userMsg = `${ctxBlock}\n【使用者問題】\n${query}\n\n請以繁體中文回答：`;

  const models = ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "llama3-70b-8192"];

  for (const model of models) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: AI_SYSTEM },
            { role: "user",   content: userMsg }
          ],
          temperature: 0.4,
          max_tokens: 1024
        })
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error(`[Groq] ${model} HTTP ${res.status}:`, errBody?.error?.message || errBody);
        continue;
      }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text) return { text, model };
    } catch (err) {
      console.error(`[Groq] ${model} 例外:`, err.message || err);
    }
  }
  console.error("[Groq] 所有模型均無回應，請按 F12 查看 Console 錯誤訊息");
  return null;
}

async function queryRAG(query) {
  // ── 1. 先從本機 KB 取得相關背景知識（不管後端在不在都有資料）
  const kbResult = queryLocalKB(query);
  const localCtx = kbResult?.answer || "";

  // ── 2. 直接呼叫 Groq（不需後端，最穩定路徑）
  const groq = await callGroqDirect(query, localCtx);
  if (groq) {
    return {
      answer: groq.text,
      llm_provider: "groq",
      llm_model: `${groq.model} (Groq)`,
      confidence_level: "high",
      confidence_score: 90,
      policy_label: "AI 綜合回答",
      message: `本機資料 ＋ ${groq.model}`,
      web_sources: [],
      structured_citations: kbResult?.structured_citations || []
    };
  }

  // ── 3. 嘗試後端 smart-ask（有跑 Flask 時才有效）
  const pageOrigin = (window.location.protocol.startsWith("http"))
    ? window.location.origin : "";
  const bases = window.HLX_API_BASE
    ? [window.HLX_API_BASE]
    : [pageOrigin, "http://127.0.0.1:5000", "http://localhost:5000"].filter(Boolean);

  for (const base of bases) {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch(`${base}/api/smart-ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, use_web: true }),
        signal: ctrl.signal
      });
      clearTimeout(tid);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status !== "success") continue;
      data.structured_citations = (data.local_evidence || []).map((e, i) => ({
        index: i + 1, source_file: e.source || "橫流溪資料庫",
        page: e.page || 1, score: e.confidence || 0.6,
        preview: e.quote || "", source_href: e.source_href || ""
      }));
      return data;
    } catch (err) {
      console.warn(`[queryRAG] ${base} 失敗:`, err.message || err);
    }
  }

  // ── 4. 完全 fallback：本機知識庫
  return kbResult;
}

async function aiSend() {
  const input = document.getElementById("aiInput");
  const q = (input.value || "").trim();
  if (!q) return;

  input.value = "";
  appendAIMsg(q, "user");
  const typing = appendTyping();
  window.lastQuery = q;

  try {
    const data = await queryRAG(q);
    typing.remove();
    const responseDiv = appendAIMsg(composeAnswer(q, data), "bot", true);
    responseDiv.dataset.confidenceLevel = data?.confidence_level || "unknown";
    responseDiv.dataset.confidenceScore = data?.confidence_score || 0;
    setTimeout(() => attachFeedbackListeners(responseDiv, data), 100);
  } catch (error) {
    typing.remove();
    appendAIMsg(`查詢發生錯誤：${error.message}\n本機知識庫仍可使用，請稍候再試。`, "bot");
  }
}

function attachFeedbackListeners(responseElement, answerData) {
  const feedbackBtns = responseElement.querySelectorAll(".ai-feedback-btn");
  feedbackBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      feedbackBtns.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      responseElement.dataset.selectedFeedback = btn.dataset.feedback;
    });
  });

  const submitBtn = responseElement.querySelector(".ai-feedback-submit");
  if (submitBtn) {
    submitBtn.addEventListener("click", () => submitFeedback(responseElement, answerData));
  }
}

function submitFeedback(responseElement, answerData) {
  const selectedFeedback = responseElement.dataset.selectedFeedback;
  const comment = responseElement.querySelector(".ai-feedback-comment")?.value || "";
  if (!selectedFeedback) {
    alert("請先選擇回饋評等");
    return;
  }

  const feedback = {
    id: Date.now().toString(),
    conversationId: window.currentConversationId || `anonymous_${Date.now()}`,
    queryText: window.lastQuery || answerData?.query || "",
    answerText: responseElement.querySelector(".ai-answer")?.textContent?.substring(0, 500) || "",
    confidenceLevel: responseElement.dataset.confidenceLevel || "unknown",
    confidenceScore: parseInt(responseElement.dataset.confidenceScore, 10) || 0,
    userRating: selectedFeedback,
    comment,
    timestamp: new Date().toISOString(),
    status: "submitted"
  };

  saveFeedbackLocally(feedback);
  syncFeedbackToBackend(feedback);
  showFeedbackConfirmation(responseElement);
}

function saveFeedbackLocally(feedback) {
  try {
    if (typeof DB === "undefined") return;
    const db = DB.load();
    db.feedback = db.feedback || [];
    db.feedback.push(feedback);
    DB.save(db);
  } catch (error) {
    console.error("回饋儲存失敗:", error);
  }
}

async function syncFeedbackToBackend(feedback) {
  try {
    await fetch("/api/v1/rag-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feedback)
    });
  } catch {
    // Keep local feedback even when backend sync is unavailable.
  }
}

function showFeedbackConfirmation(responseElement) {
  const feedbackSection = responseElement.querySelector(".ai-feedback-section");
  if (!feedbackSection) return;
  feedbackSection.innerHTML = '<div class="ai-feedback-confirmation">已收到回饋，謝謝。</div>';
}

function buildFacilityAIQuestion(subject) {
  const name = String(subject || "").trim();
  let facility = null;
  try {
    if (typeof DB !== "undefined" && name) {
      facility = DB.getAll("facilities").find(item => item.name === name || item.id === name) || null;
    }
  } catch (_) {
    facility = null;
  }

  const facilityInfo = facility
    ? [
        `設施名稱：${facility.name || name}`,
        `工程類型：${facility.subType || facility.type || "-"}`,
        `位置：${facility.location || facility.stationKm || facility.tableLocation || "-"}`,
        `狀態：${facility.status || "-"}`,
        `健康指數：${typeof fac_health === "function" ? fac_health(facility) : "-"}`
      ].join("；")
    : `設施名稱：${name}`;

  return [
    `請針對「${name}」進行橫流溪工程設施 AI 分析。`,
    facilityInfo,
    "請整合工程設施資料、巡查紀錄、DER&U、AI影像辨識與維護管理資料，具體回答：",
    "1. 目前主要風險與異常判斷。",
    "2. 是否需要維護，以及維護優先順序。",
    "3. 建議處理方式、巡查重點與可量化判斷依據。",
    "回答請精簡、具體、以管理建議為主，不要列出文件出處。"
  ].join("\n");
}

function aiAsk(subject) {
  if (typeof initAIChat === "function") initAIChat();

  const panel = document.getElementById("aiChatPanel");
  if (panel && !panel.classList.contains("open")) {
    if (typeof toggleAIChat === "function") toggleAIChat();
    else panel.classList.add("open");
  }

  const input = document.getElementById("aiInput");
  if (!input) {
    if (typeof showToast === "function") showToast("AI 助理尚未載入，請重新整理頁面後再試。", "error");
    return;
  }

  input.value = buildFacilityAIQuestion(subject);
  input.focus();

  if (typeof aiSend === "function") {
    setTimeout(() => aiSend(), 50);
  } else if (typeof showToast === "function") {
    showToast("AI 送出函式尚未載入，請重新整理頁面後再試。", "error");
  }
}
