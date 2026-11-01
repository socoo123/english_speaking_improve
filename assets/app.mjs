import { SCORE_KEYS, SCORE_LABELS, feedbackTemplate, parseReport, gradeQuiz } from './report.mjs';

const app = document.querySelector('#app');
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const list = items => `<ul>${items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`;
const scoreCards = scores => `<div class="score-grid">${SCORE_KEYS.map(key => `<div class="score"><strong>${scores?.[key] ?? '—'}${scores?.[key] != null ? '<small> / 5</small>' : ''}</strong><span>${SCORE_LABELS[key]}</span></div>`).join('')}</div>`;
let lessons, progress, rules, lesson, ready = false, feedbackText = '', view = '';
let toastTimer;

function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), 4500);
}

function readLocal(key) {
  try { return localStorage.getItem(key); }
  catch { return null; }
}

function saveLocal(key, value) {
  try { localStorage.setItem(key, value); return true; }
  catch { toast('浏览器无法保存，请下载 JSON 备份。'); return false; }
}

async function copyText(text, textarea) {
  try { await navigator.clipboard.writeText(text); toast('已复制，可以粘贴到 GPT 对话。'); }
  catch {
    textarea.focus(); textarea.select();
    toast('自动复制不可用，已选中文本，请手动复制。');
  }
}

function downloadReport(text) {
  const result = parseReport(text, lesson.id);
  if (!result.valid) { showFeedback(result); return; }
  const url = URL.createObjectURL(new Blob([JSON.stringify(result.report, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `lesson-${lesson.id}-feedback-${result.report.assessedAt}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('已导出反馈。它仍是待复核报告，不是正式成绩。');
}

function heading(label, badge = '美音优先 · 每周 10 小时') {
  return `<div class="page-heading"><p>LEARNING JOURNAL <span aria-hidden="true"> / </span> ${label}</p><span class="badge">${badge}</span></div>`;
}

function overview() {
  return `${heading('我的学习方向')}
    <section class="hero">
      <div class="hero-copy"><p class="eyebrow">SIX MONTHS. REAL CONVERSATIONS.</p><h1>从“我听懂了”，<span>到“让我来说”。</span></h1><p>用半年时间，把英语练进真实工作里。<br>从需求澄清开始，一步步学会讨论方案、回应追问，清楚地表达自己的想法。</p><div class="actions"><a class="button" href="#lesson">进入本章练习 <span aria-hidden="true">↗</span></a><a class="button secondary" href="#tutor">先做口语诊断</a></div></div>
      <div class="hero-art" aria-hidden="true"><div class="orbit"><span class="art-dot"></span><div class="orbit-number">26<small>WEEKS TO GROW</small></div></div><span class="floating one">“Could you clarify…?”</span><span class="floating two">A clearer voice, every week.</span></div>
    </section>
    <div class="metrics"><div class="metric"><strong>B1 → B2</strong><span>工作沟通的努力方向</span></div><div class="metric"><strong>10 <small>h / 周</small></strong><span>持续投入，允许调整节奏</span></div><div class="metric"><strong>80 / 20</strong><span>工作与面试 / 生活与旅行</span></div><div class="metric"><strong>美式英语</strong><span>当前发音训练参考</span></div></div>
    <div class="section-header"><h2>从这一章开始</h2><span>掌握一章，再推荐下一章</span></div>
    <div class="grid-two"><section class="panel"><div class="course-kicker"><span class="large-number">${escape(lesson.number)}</span><div><p class="eyebrow">REQUIREMENTS & CLARITY</p><h3>${escape(lesson.title)}</h3></div></div><p class="muted">${escape(lesson.summary)}</p><div class="chips"><span class="chip">B1 起步</span><span class="chip">需求澄清</span><span class="chip">原创课文</span></div><div class="notice">视频及字幕许可待核实。现在可使用原创课文和外教指令练习；尚未完成正式口语测评。</div><a class="inline-link" href="#lesson">查看课文与练习 →</a></section>
    <section class="panel green"><p class="eyebrow">YOUR AI SPEAKING COACH</p><h2>不只背会，<br>还要在新场景里说出来。</h2><p class="muted">每课都有专属外教指令。练发音、做对话、接受追问，再把真实反馈带回来。</p><a class="button small" href="#tutor">查看本课外教要求 ↗</a></section></div>
    <div class="grid-two"><section class="panel"><h3>训练围绕你的生活展开</h3><p class="muted">优先练需求、架构和技术面试，也留出空间练旅行与日常交流。</p><div class="mixbar" aria-label="工作场景百分之八十，生活场景百分之二十"><span></span><span></span></div><div class="mixlabels"><span>80% 工作 / 面试</span><span>20% 生活 / 旅行</span></div><div class="chips"><span class="chip">需求讨论</span><span class="chip">架构与取舍</span><span class="chip">项目经历</span><span class="chip">日常沟通</span></div></section>
    <section class="panel"><h3>每周 10 小时，形成闭环</h3><div class="time-list"><span>视频理解与精听</span><span>2 小时</span><span>跟读、背诵与复述</span><span>2.5 小时</span><span>表达、语法与自测</span><span>1.5 小时</span><span>外教对话与发音纠正</span><span>3 小时</span><span>测评与复习</span><span>1 小时</span></div></section></div>
    <section class="panel"><h3>下一章，由你的表现决定</h3><ol class="steps"><li>你确认本章学得差不多，准备参加测试。</li><li>GPT 外教用新场景考核，给出有证据的评分与发音反馈。</li><li>你把报告带回本项目，复核后更新正式成绩，再选新课或补练。</li></ol><p class="muted small-text">约 260 小时是训练投入，不是语言等级保证。当前 B1 为自评；口语基线仍待诊断。半年后可再加入印度英语等口音训练。</p></section>`;
}

function safeUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
}

function videoSection() {
  const source = lesson.source;
  if (source.status === 'verified' && /^[A-Za-z0-9_-]{11}$/.test(source.youtubeId) && safeUrl(source.url) && safeUrl(source.licenseUrl) && source.verifiedAt && source.licenseSummary) {
    return `<iframe class="video-frame" src="https://www.youtube-nocookie.com/embed/${escape(source.youtubeId)}" title="${escape(source.title)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe><p class="small-text"><a href="${escape(safeUrl(source.url))}" target="_blank" rel="noopener noreferrer">视频原页 ↗</a> · <a href="${escape(safeUrl(source.licenseUrl))}" target="_blank" rel="noopener noreferrer">许可来源 ↗</a></p><p class="small-text muted">${escape(source.licenseSummary)} · 核实日期：${escape(source.verifiedAt)}</p>`;
  }
  return `<div class="video-placeholder"><span class="play" aria-hidden="true">▷</span><h3>为本章挑一段合适的美音视频</h3><p>${escape(source.notes)}</p><span class="badge neutral">待核实来源 · 暂无视频</span></div>`;
}

function quizMarkup() {
  return `<form id="quiz-form">${lesson.quiz.map((question, index) => `<fieldset class="quiz-question"><legend>${index + 1}. ${escape(question.question)}</legend>${question.type === 'choice' ? question.options.map((option, i) => `<label class="option"><input type="radio" name="${question.id}" value="${i}"><span>${escape(option)}</span></label>`).join('') : `<label class="sr-only" for="${question.id}">第 ${index + 1} 题答案</label><input class="fill-input" id="${question.id}" name="${question.id}" type="text" autocomplete="off" placeholder="填写英文答案">`}<div id="result-${question.id}" aria-live="polite"></div></fieldset>`).join('')}<div class="actions"><button class="button" type="submit">检查答案</button><button class="button secondary" type="reset">重新练习</button></div><div id="quiz-summary" class="quiz-summary" role="status"></div></form>`;
}

function lessonView() {
  return `${heading('本章学习', `CHAPTER ${escape(lesson.number)} · ${lesson.source.status === 'verified' ? '视频与配套练习' : '原创练习示范'}`)}
    <section class="lesson-header"><p class="eyebrow">${escape(lesson.category)} · ${escape(lesson.level)}</p><h1>${escape(lesson.number)} / ${escape(lesson.title)}</h1><p class="english-title" lang="en">${escape(lesson.englishTitle)}</p><p class="summary">${escape(lesson.summary)}</p></section>
    <nav class="subnav" aria-label="本章内容"><a href="#lesson/video">视频</a><a href="#lesson/text">课文</a><a href="#lesson/words">核心词汇</a><a href="#lesson/grammar">句型语法</a><a href="#lesson/pronunciation">发音</a><a href="#lesson/quiz">自测</a><a href="#tutor">外教陪练 ↗</a></nav>
    <section class="panel"><h3>本章要做到</h3>${list(lesson.goals)}<p class="muted small-text">可以跨周完成。本章未正式测评，没有预设成绩。</p></section>
    <section class="panel" id="video"><div class="section-header" style="margin-top:0"><h2>先听，再开口</h2><span>视频来源核实后启用播放器</span></div>${videoSection()}</section>
    <section class="panel" id="text"><div class="status-row"><h2>理解这段对话</h2><button class="button secondary small" id="toggle-translation" aria-pressed="false">隐藏中文</button></div><p class="muted small-text">原创配套课文 · 非外部视频逐字稿。先理解，再背核心表达，最后脱稿复述。</p><ol class="transcript">${lesson.text.map(line => `<li><span class="speaker">${escape(line.speaker)}</span><p class="english" lang="en">${escape(line.en)}</p><p class="translation">${escape(line.zh)}</p></li>`).join('')}</ol></section>
    <section class="panel" id="words"><h2>核心词汇与搭配</h2><p class="muted small-text">IPA 为美音参考；发音练习点不是对你个人错误的判断。</p><div class="vocab-grid">${lesson.vocabulary.map(word => `<article class="vocab-card"><h3 lang="en">${escape(word.word)}</h3><span class="ipa">${escape(word.ipa)}</span><p class="meaning">${escape(word.meaning)}</p><p class="example" lang="en">${escape(word.example)}</p><p class="note">${escape(word.note)}</p></article>`).join('')}</div></section>
    <section class="panel" id="grammar"><h2>把句型变成自己的表达</h2>${lesson.patterns.map(pattern => `<article class="pattern"><h3>${escape(pattern.form)}</h3><p>${escape(pattern.explanation)}</p><p class="example" lang="en">${escape(pattern.example)}</p>${pattern.contrast ? `<p class="muted small-text">${escape(pattern.contrast)}</p>` : ''}</article>`).join('')}</section>
    <section class="panel" id="pronunciation"><h2>发音，要认真练到稳定</h2><p class="muted">让外教先听真实音频，再选 1—3 个重点纠正。单词 → 短语 → 句子 → 新场景，复测后才判断掌握。</p>${list(lesson.pronunciationTargets)}<div class="notice">只有文字转写时，不能判断发音或口语流畅度。请外教说明实际音频分析能力；没有依据的项目保持未评估。</div><h3>本章核心背诵</h3><div class="memorize" lang="en">${list(lesson.memorize)}</div></section>
    <section class="panel" id="quiz"><h2>检查你的理解</h2><p class="muted small-text">做完再看解析。这里的成绩只反映知识练习，不作为口语过关依据。</p>${quizMarkup()}</section>
    <section class="panel green"><h2>现在，把它用在对话里。</h2><p class="muted">练习追问、复述和确认。外教会用新的场景测试你，听发音，并留下具体反馈。</p><a class="button" href="#tutor">获取本章外教指令 ↗</a></section>`;
}

const diagnostic = `你是我的英语口语外教。我自评约 B1，计划半年每周学习 10 小时，80% 工作会议/技术面试、20% 生活，当前发音参考 General American。
请先进行 10—15 分钟基线诊断，不假设我已经达到 B1，也不把一次对话当作正式 CEFR 认证。
先确认你是否真的能分析我的原始音频。若只有文字转写，明确说明不能评价发音、口语流畅度或语调；不要猜测我的错误。
用自然、适合 B1 的英语，每次只问一个问题，等我回答再追问。依次覆盖自我介绍、熟悉项目、澄清模糊需求、比较简单方案，以及一个旅游/生活场景。不要先替我给答案。
有真实音频时，挑 1—3 个实际观察到的发音重点，给美音参考、必要的 IPA/口型解释，并用新句复测。不能只说“能听懂就行”；也不要把所有地区差异判错。证据不清楚时请我重录。
最后用中文给出有具体证据的能力概况、未评估项、最优先的三个训练点和下一次练习建议。请将此标记为“基线诊断”，不要误当作第一课过关报告。`;

function tutorPrompt() {
  return `${rules}

--- 当前课程（请以本段约束本次教学） ---
lessonId: ${lesson.id}
标题：${lesson.title} / ${lesson.englishTitle}
素材状态：原创练习；视频待核实。没有视频字幕，请勿声称已看过或听过外部视频。
目标：${lesson.goals.join('；')}
学习者在网页中的自评准备状态：${ready ? '已勾选准备好，请在正式测试前再次口头确认。' : '尚未确认准备好，先进行陪练，不直接判定过关。'}

原创课文：
${lesson.text.map(line => `${line.speaker}: ${line.en}`).join('\n')}

核心表达：
${lesson.memorize.join('\n')}
词汇与例句：
${lesson.vocabulary.map(word => `${word.word} ${word.ipa}（${word.meaning}）: ${word.example}`).join('\n')}
句型语法：
${lesson.patterns.map(pattern => `${pattern.form}：${pattern.explanation} 例句：${pattern.example}`).join('\n')}
待观察的发音目标（不是已发现的个人错误）：
${lesson.pronunciationTargets.join('\n')}
公开陪练场景：
${lesson.practiceScenarios.join('\n')}
正式考核：${lesson.assessmentFocus}

评分约定：五项各 0—5 整数，0=有实际测试但无法完成，1=严重依赖帮助，2=只能部分完成，3=基本独立但反复出错，4=稳定独立完成，5=新增限制与追问下仍稳定。未评估用 null，不能当作零分。五项齐全时总分为分数之和乘 4。建议过关要求所有项≥3，task≥4，pronunciation≥4，总分≥80，并满足本规则的音频、独立新场景、本人确认和复测证据要求。发音4分需要目标音素、词重音、意群总体稳定，并在新句中复测；5分须在即兴表达中保持。
本次报告模板（根据真实测试填写；assessedAt 使用实际日期；pronunciationNotes 每项必须有 target、observed、correction、retest、status；status 为 resolved/improving/unresolved/verified）：
${JSON.stringify(feedbackTemplate(lesson.id), null, 2)}
结束时输出一个完整 JSON 代码块。报告只是外教建议，不能声称已更新网页、仓库或正式晋级。`;
}

function tutorView() {
  return `${heading('GPT 外教', `本课专属 · CHAPTER ${escape(lesson.number)}`)}
    <section class="lesson-header"><p class="eyebrow">PRACTICE → FEEDBACK → PRACTICE</p><h1>让外教认真听，也认真纠正。</h1><p class="summary">把这份指令复制到 GPT。本章目标、课文、发音重点、考核要求和报告格式都已包含。</p></section>
    <div class="grid-two"><section class="panel"><h3>先练习，再独立测试</h3><ol class="steps"><li>说明你想陪练，还是已经准备好正式测试。</li><li>每次一个问题，尝试用本章表达完成交流。</li><li>让外教指出真实问题，练习后再换句复测。</li><li>测试结束，复制 JSON 报告到“反馈与记录”。</li></ol></section><section class="panel"><h3>三个发音关注点</h3><p><strong>可理解度</strong> · 听者能否轻松理解？</p><p><strong>美音准确度</strong> · 目标音素和词重音是否稳定？</p><p><strong>自然度</strong> · 句重音、意群和节奏是否合适？</p><p class="muted small-text">认真改进，方便将来向孩子示范。不要求消除所有口音；音频证据不足时先重录，无法验证则不评分。</p></section></div>
    <section class="panel"><h2>第一次开始：做口语诊断</h2><p class="muted">先了解你的真实起点。诊断与本课过关测试分开，不预填成绩。</p><details><summary>展开基线诊断指令</summary><label class="sr-only" for="diagnostic-prompt">基线诊断指令</label><textarea class="prompt-box" id="diagnostic-prompt" readonly>${escape(diagnostic)}</textarea><div class="actions"><button class="button secondary" id="copy-diagnostic">复制诊断指令</button></div></details></section>
    <section class="panel"><div class="status-row"><h2>${escape(lesson.number)} · ${escape(lesson.title)}</h2><span class="badge neutral">每课独立指令</span></div><label class="check-label"><input type="checkbox" id="ready-check" ${ready ? 'checked' : ''}><span>我觉得本章练得差不多了，准备接受正式测试。<br><small class="muted">仅记录本人意愿，不代表外教已测评或已过关。</small></span></label><label class="form-label" for="tutor-prompt">完整外教指令</label><textarea id="tutor-prompt" class="prompt-box" readonly>${escape(tutorPrompt())}</textarea><div class="actions"><button class="button" id="copy-tutor">复制本课指令 ↗</button><a href="#progress" class="button secondary">填写外教反馈</a></div><p class="muted small-text" style="margin-top:15px">建议使用能分析实际音频的会话。网页本身不会录音、连接 GPT 或分析你的发音。</p></section>
    <section class="panel"><h3>本章公开陪练场景</h3>${list(lesson.practiceScenarios)}<p class="muted small-text">正式测试会另出至少两个新场景，不直接复用这些题，也不先给目标答案。</p><details><summary>查看本课空白反馈模板</summary><label class="sr-only" for="feedback-template">本课 JSON 反馈模板</label><textarea id="feedback-template" class="prompt-box" readonly>${escape(JSON.stringify(feedbackTemplate(lesson.id), null, 2))}</textarea><div class="actions"><button id="copy-template" class="button secondary">复制空白模板</button></div></details></section>`;
}

function progressView() {
  const record = progress.records.find(item => item.lessonId === lesson.id);
  const statusLabel = { not_assessed: '尚未测评', needs_practice: '需要补练', passed: '已复核通过' }[record?.status] || '待核对';
  return `${heading('反馈与记录', '本地反馈 ≠ 正式成绩')}
    <section class="lesson-header"><p class="eyebrow">KEEP THE EVIDENCE. SEE THE PROGRESS.</p><h1>让每一次练习，留下依据。</h1><p class="summary">把外教报告带回来，复核后再更新正式结果和下一章安排。</p></section>
    <section class="panel"><div class="status-row"><h2>本章正式记录</h2><span class="badge neutral">${statusLabel}</span></div><p class="muted">${escape(record?.summary || '尚无正式记录。')}</p>${scoreCards(record?.scores)}<p class="small-text muted" style="margin-top:15px">${record?.total != null ? `正式总分：${escape(record.total)} / 100` : '总分：未评估'} · ${record?.reviewedAt ? `复核日期：${escape(record.reviewedAt)}` : '暂无复核日期'}</p>${record?.history?.length ? `<details><summary>历史测评摘要</summary>${record.history.map(item => `<p>${escape(item.assessedAt)} · ${escape(item.summary)}</p>`).join('')}</details>` : ''}</section>
    <section class="panel"><h2>粘贴本课外教反馈</h2><p class="muted">复制外教输出的完整 JSON，可包含代码块。保存后仅留在当前浏览器；你仍需把报告发回项目维护对话。</p><label class="form-label" for="feedback-input">第 ${escape(lesson.number)} 课 · JSON 报告</label><textarea class="prompt-box feedback-box" id="feedback-input" spellcheck="false" placeholder="在这里粘贴外教填写的 JSON 报告…">${escape(feedbackText)}</textarea><div class="actions"><button class="button" id="validate-feedback">校验报告</button><button class="button secondary" id="save-feedback">暂存本浏览器</button><button class="button secondary" id="download-feedback">下载 JSON</button></div><div id="feedback-result" class="feedback-result" role="status" aria-live="polite"></div><div class="notice">网页只核对格式和过关条件，不能验证报告真实性。即使满足门槛，也只是待复核；不会自动更改正式分数或解锁下一章。</div><p class="small-text muted">换设备时，可粘贴已下载的 JSON 恢复。公开仓库只记录脱敏摘要；不要提交录音、真实同事姓名、公司机密或未经脱敏的个人报告。</p></section>
    <section class="panel"><h3>什么时候推荐下一章？</h3><p>本人确认准备好，外教独立测评有足够证据，并经复核通过。五项各 0—5 分，总分至少 80/100；每项至少 3 分，任务完成和发音至少 4 分。</p><p class="muted">还需真实音频、至少两个新场景、无辅导提示，以及稳定的发音复测记录。缺少项目时不计算完整总分，先补测或补练。</p><a class="inline-link" href="./docs/tutor-rules.md">完整外教规则 ↗</a></section>`;
}

function showFeedback(result) {
  const element = document.querySelector('#feedback-result');
  if (!element) return;
  element.classList.toggle('error', !result.valid);
  if (!result.valid) { element.innerHTML = `<strong>报告需要修正</strong>${list(result.errors)}`; return; }
  const report = result.report;
  const status = result.eligible && report.recommendation === 'pass' ? '符合过关建议门槛，待人工复核' : '报告格式有效，仍需补练或补测';
  element.innerHTML = `<strong>${status}</strong><p class="small-text">外教测评日期：${escape(report.assessedAt)} · ${report.mode === 'audio' ? '音频会话' : '文字会话'} · ${report.audioEvidence ? '报告声明已分析原始音频' : '无原始音频分析依据'}</p>${scoreCards(report.scores)}<p style="margin-top:14px">${result.total === null ? '总分未计算：存在未评估项目。' : `外教报告总分：${result.total} / 100（非正式记录）`}</p>${report.nextPractice.length ? `<strong>下一步练习</strong>${list(report.nextPractice)}` : ''}<p class="small-text">把报告发回项目维护对话，核对证据后再更新正式结果。</p>`;
}

function bindEvents() {
  if (view === 'lesson') {
    document.querySelector('#toggle-translation').addEventListener('click', event => {
      const hidden = event.currentTarget.getAttribute('aria-pressed') !== 'true';
      event.currentTarget.setAttribute('aria-pressed', String(hidden));
      event.currentTarget.textContent = hidden ? '显示中文' : '隐藏中文';
      document.querySelectorAll('.translation').forEach(item => { item.hidden = hidden; });
    });
    const form = document.querySelector('#quiz-form');
    form.addEventListener('submit', event => {
      event.preventDefault();
      const results = gradeQuiz(lesson.quiz, Object.fromEntries(new FormData(form)));
      for (const result of results) document.querySelector(`#result-${result.id}`).innerHTML = `<p class="answer-result ${result.correct ? 'correct' : 'incorrect'}">${result.correct ? '✓ 回答正确' : result.answered ? '再想一想' : '尚未作答'} · ${escape(result.explanation)}</p>`;
      document.querySelector('#quiz-summary').textContent = `${results.filter(result => result.correct).length} / ${results.length} 题正确。此成绩只用于知识练习，不记录为口语成绩。`;
    });
    form.addEventListener('reset', () => {
      lesson.quiz.forEach(question => { document.querySelector(`#result-${question.id}`).textContent = ''; });
      document.querySelector('#quiz-summary').textContent = '';
    });
  }
  if (view === 'tutor') {
    for (const [button, textarea] of [['copy-tutor', 'tutor-prompt'], ['copy-diagnostic', 'diagnostic-prompt'], ['copy-template', 'feedback-template']]) document.querySelector(`#${button}`).addEventListener('click', () => { const element = document.querySelector(`#${textarea}`); copyText(element.value, element); });
    document.querySelector('#ready-check').addEventListener('change', event => {
      ready = event.currentTarget.checked;
      saveLocal(`speak-ready-${lesson.id}`, String(ready));
      document.querySelector('#tutor-prompt').value = tutorPrompt();
    });
  }
  if (view === 'progress') {
    const input = document.querySelector('#feedback-input');
    input.addEventListener('input', () => { feedbackText = input.value; document.querySelector('#feedback-result').textContent = ''; });
    document.querySelector('#validate-feedback').addEventListener('click', () => showFeedback(parseReport(input.value, lesson.id)));
    document.querySelector('#save-feedback').addEventListener('click', () => {
      const result = parseReport(input.value, lesson.id);
      showFeedback(result);
      if (result.valid && saveLocal(`speak-feedback-${lesson.id}`, JSON.stringify(result.report, null, 2))) toast('反馈已暂存在此浏览器，正式记录未变更。');
    });
    document.querySelector('#download-feedback').addEventListener('click', () => downloadReport(input.value));
    if (feedbackText) showFeedback(parseReport(feedbackText, lesson.id));
  }
}

function route(initial = false) {
  const [requested, anchor] = location.hash.slice(1).split('/');
  const next = ['overview', 'lesson', 'tutor', 'progress'].includes(requested) ? requested : 'overview';
  const changed = view !== next;
  if (changed) {
    view = next;
    app.innerHTML = { overview, lesson: lessonView, tutor: tutorView, progress: progressView }[view]();
    document.title = `${{ overview: '学习方向', lesson: lesson.title, tutor: 'GPT 外教', progress: '反馈与记录' }[view]} · Speak at Work`;
    document.querySelectorAll('[data-view]').forEach(link => {
      const active = link.dataset.view === view;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    bindEvents();
    if (!initial) document.querySelector('#main').focus({ preventScroll: true });
  }
  if (anchor && view === 'lesson' && ['video', 'text', 'words', 'grammar', 'pronunciation', 'quiz'].includes(anchor)) document.getElementById(anchor)?.scrollIntoView();
  else if (changed) window.scrollTo(0, 0);
}

async function load(path, json = true) {
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok) throw new Error(`无法读取 ${path}（${response.status}）`);
  return json ? response.json() : response.text();
}

try {
  [lessons, progress, rules] = await Promise.all([load('../data/lessons.json'), load('../data/progress.json'), load('../docs/tutor-rules.md', false)]);
  const selectedId = new URL(location.href).searchParams.get('lesson');
  lesson = lessons.find(item => item.id === selectedId) || lessons.at(-1);
  if (!lesson || !Array.isArray(progress.records)) throw new Error('课程或记录格式不完整。');
  ready = readLocal(`speak-ready-${lesson.id}`) === 'true';
  feedbackText = readLocal(`speak-feedback-${lesson.id}`) || '';
  document.querySelector('.chapter-link').innerHTML = `<span class="chapter-num">${escape(lesson.number)}</span><span>${escape(lesson.title)}<small>${escape(lesson.englishTitle)}</small></span>`;
  document.querySelector('.sidebar-course .badge').textContent = lesson.source.status === 'verified' ? '视频与配套练习' : '原创练习 · 视频待核实';
  const selector = document.querySelector('#lesson-select');
  selector.innerHTML = lessons.map(item => `<option value="${escape(item.id)}" ${item.id === lesson.id ? 'selected' : ''}>${escape(item.number)} · ${escape(item.title)}</option>`).join('');
  selector.addEventListener('change', () => {
    const target = new URL(location.href);
    target.searchParams.set('lesson', selector.value);
    target.hash = 'lesson';
    location.assign(target.href);
  });
  route(true);
  window.addEventListener('hashchange', () => route());
} catch (error) {
  app.innerHTML = `<section class="panel"><h1>学习内容暂时无法加载</h1><p>${escape(error.message)}</p><p>请通过 HTTP 服务打开网页，并确认 data 与 docs 目录和网页一起部署。</p><button class="button" id="retry-load">重新加载</button></section>`;
  document.querySelector('#retry-load').addEventListener('click', () => location.reload());
}
