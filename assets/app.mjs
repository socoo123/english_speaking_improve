import { learningProgress } from './progress.mjs';
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
  return `<section class="content-section"><div class="section-title"><h3>本周目标</h3><span class="muted small-text">${escape(lesson.level)}</span></div><ul class="goals">${lesson.goals.map(goal => `<li>${escape(goal)}</li>`).join('')}</ul></section>
    <section class="content-section" id="video">${videoSection()}</section>
    <section class="content-section" id="text"><div class="status-row"><h3>本周课文 <span class="heading-en">${escape(lesson.englishTitle)}</span></h3><button class="button secondary small" id="toggle-translation" aria-pressed="false">隐藏中文</button></div><p class="muted small-text">原创练习 · 非视频逐字稿。理解 → 背诵核心表达 → 脱稿复述。</p><ol class="transcript">${lesson.text.map(line => `<li><span class="speaker">${escape(line.speaker)}</span><p class="english" lang="en">${escape(line.en)}</p><p class="translation">${escape(line.zh)}</p></li>`).join('')}</ol></section>
    <div class="actions"><a class="button" href="#language">接着练词汇与句型 →</a></div>`;
}

function languageView() {
  return `<section class="content-section" id="words"><h3>核心词汇与搭配</h3><p class="muted small-text">结合例句记忆，再换成你自己的工作场景。</p><div class="vocab-list">${lesson.vocabulary.map(word => `<article class="vocab-row"><div><h4 lang="en">${escape(word.word)}</h4><span class="ipa">${escape(word.ipa)}</span><p class="meaning">${escape(word.meaning)}</p></div><div><p class="example" lang="en">${escape(word.example)}</p><p class="muted small-text">${escape(word.note)}</p></div></article>`).join('')}</div></section>
    <section class="content-section" id="grammar"><h3>把句型变成自己的表达</h3>${lesson.patterns.map(pattern => `<article class="pattern"><h4>${escape(pattern.form)}</h4><p>${escape(pattern.explanation)}</p><p class="example" lang="en">${escape(pattern.example)}</p>${pattern.contrast ? `<p class="muted small-text">${escape(pattern.contrast)}</p>` : ''}</article>`).join('')}</section>
    <section class="content-section" id="pronunciation"><h3>美音练习重点</h3><p class="muted">请外教听真实音频，选 1—3 个重点纠正，再用新句复测。这些是观察目标，并非已发现的个人错误。</p>${list(lesson.pronunciationTargets)}<h4>本周核心背诵</h4><div class="memorize" lang="en">${list(lesson.memorize)}</div></section><div class="actions"><a href="#quiz" class="button">做一轮巩固练习 →</a></div>`;
}

function quizView() {
  return `<section class="content-section"><h3>检查你的理解</h3><p class="muted">做完再看解析。知识练习不计入口语成绩或学习进度。</p>${quizMarkup()}</section><div class="actions"><a href="#tutor" class="inline-link">练会了，找外教聊一聊 →</a></div>`;
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
素材状态：${lesson.source.status === 'verified' ? `已核实的视频来源：${lesson.source.title}（${lesson.source.url}）。仅凭本指令不得声称已观看或听过视频。` : '原创练习；视频待核实。没有视频字幕，请勿声称已看过或听过外部视频。'}
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
  return `<section class="content-section"><h3>本周外教陪练</h3><p class="muted">复制指令到 GPT 语音会话：先用本周表达练对话，再独立测试。外教需要认真纠正发音，并在新句中复测。</p><details><summary>第一次开始？先做 10—15 分钟口语诊断</summary><textarea class="prompt-box" id="diagnostic-prompt" aria-label="基线诊断指令" readonly>${escape(diagnostic)}</textarea><div class="actions"><button class="button secondary" id="copy-diagnostic">复制诊断指令</button></div></details>
    <label class="check-label"><input type="checkbox" id="ready-check" ${ready ? 'checked' : ''}><span>我觉得本周练得差不多了，准备接受正式测试。<small class="muted">仅记录你的准备状态，测评通过并复核后才更新进度。</small></span></label><label class="form-label" for="tutor-prompt">本周专属外教指令</label><textarea id="tutor-prompt" class="prompt-box" readonly>${escape(tutorPrompt())}</textarea><div class="actions"><button class="button" id="copy-tutor">复制本课指令 ↗</button><a href="#progress" class="button secondary">带回外教反馈</a></div><p class="muted small-text">请使用能分析真实音频的会话；只有文字转写时，不评估发音和口语流畅度。</p></section>
    <section class="content-section"><h3>用这些场景热身</h3>${list(lesson.practiceScenarios)}<p class="muted small-text">正式测试另出至少两个新场景，不提前给答案。</p><details><summary>本周反馈模板</summary><textarea id="feedback-template" class="prompt-box" aria-label="本课 JSON 反馈模板" readonly>${escape(JSON.stringify(feedbackTemplate(lesson.id), null, 2))}</textarea><div class="actions"><button id="copy-template" class="button secondary">复制空白模板</button></div></details></section>`;
}

function progressView() {
  const record = progress.records.find(item => item.lessonId === lesson.id);
  const statusLabel = { not_assessed: '尚未测评', needs_practice: '需要补练', passed: '已复核通过' }[record?.status] || '待测评';
  return `<section class="content-section"><div class="status-row"><h3>本周正式成绩</h3><span class="badge neutral">${statusLabel}</span></div><p class="muted">${escape(record?.summary || '尚无正式记录。')}</p>${scoreCards(record?.scores)}<p class="small-text muted">${record?.total != null ? `正式总分：${escape(record.total)} / 100` : '总分：未评估'} · ${record?.reviewedAt ? `复核日期：${escape(record.reviewedAt)}` : '暂无复核日期'}</p>${record?.history?.length ? `<details><summary>历史测评摘要</summary>${record.history.map(item => `<p>${escape(item.assessedAt)} · ${escape(item.summary)}</p>`).join('')}</details>` : ''}</section>
    <section class="content-section"><h3>带回本周外教反馈</h3><p class="muted">粘贴 GPT 的 JSON 报告，在这里检查并备份，再发回我们的对话。复核通过后，我会更新上方进度并安排下一周课程。</p><label class="form-label" for="feedback-input">第 ${escape(lesson.week)} 周 · 外教报告</label><textarea class="prompt-box feedback-box" id="feedback-input" spellcheck="false" placeholder="粘贴外教填写的完整 JSON 报告…">${escape(feedbackText)}</textarea><div class="actions"><button class="button" id="validate-feedback">校验报告</button><button class="button secondary" id="save-feedback">暂存本浏览器</button><button class="button secondary" id="download-feedback">下载 JSON</button></div><div id="feedback-result" class="feedback-result" role="status" aria-live="polite"></div><p class="notice">这里校验格式与过关条件；正式成绩须回到对话中复核。暂存报告不会自动更新进度。</p><details><summary>过关标准与反馈隐私</summary><p>本人确认准备好，确实分析原始音频，至少两个新场景，无辅导提示。五项均 ≥3，任务与发音 ≥4，总分 ≥80，并有实际表现和稳定发音复测的证据。信息不足时先补测。</p><p>报告暂存仅保留在本浏览器。换设备可粘贴下载的 JSON 恢复。公开记录只保留脱敏摘要，不提交录音、公司机密或个人原始报告。</p><a href="./docs/tutor-rules.md" class="inline-link">完整外教规则 ↗</a></details></section>`;
}

function updateJourney() {
  const state = learningProgress(lessons, progress);
  document.querySelector('#passed-weeks').textContent = state.completed;
  document.querySelector('#progress-percent').textContent = `${state.percent}%`;
  const bar = document.querySelector('#learning-progress');
  bar.max = state.total; bar.value = state.completed;
  document.querySelector('.progress-number > span').textContent = `/ ${state.total} 周`;
  document.querySelector('#progress-description').textContent = `已复核通过 ${state.completed} 周。${state.completed === state.total ? '半年计划已完成，可以回顾学习成果。' : '每次通过后，更新进度并安排下一课。'}`;
  document.querySelector('#week-label').textContent = `WEEK ${String(lesson.week).padStart(2, '0')} / 本周课程`;
  document.querySelector('#week-title').textContent = lesson.title;
  document.querySelector('#week-summary').textContent = lesson.summary;
  const record = progress.records.find(item => item.lessonId === lesson.id);
  document.querySelector('#week-status').textContent = record?.status === 'passed' && record.reviewedAt ? '已复核通过' : record?.status === 'needs_practice' ? '继续补练' : '待测评';
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
  {
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
  {
    for (const [button, textarea] of [['copy-tutor', 'tutor-prompt'], ['copy-diagnostic', 'diagnostic-prompt'], ['copy-template', 'feedback-template']]) document.querySelector(`#${button}`).addEventListener('click', () => { const element = document.querySelector(`#${textarea}`); copyText(element.value, element); });
    document.querySelector('#ready-check').addEventListener('change', event => {
      ready = event.currentTarget.checked;
      saveLocal(`speak-ready-${lesson.id}`, String(ready));
      document.querySelector('#tutor-prompt').value = tutorPrompt();
    });
  }
  {
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

const tabViews = ['lesson', 'language', 'quiz', 'tutor', 'progress'];
function route(navigate = false) {
  const [requested, anchor] = location.hash.slice(1).split('/');
  let next = tabViews.includes(requested) ? requested : 'lesson';
  if (requested === 'lesson' && ['words', 'grammar', 'pronunciation'].includes(anchor)) next = 'language';
  if (requested === 'lesson' && anchor === 'quiz') next = 'quiz';
  view = next;
  document.querySelectorAll('[data-view]').forEach(tab => {
    const active = tab.dataset.view === view;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.querySelector(`#panel-${tab.dataset.view}`).hidden = !active;
  });
  document.title = '码农口语提升指南';
  if (anchor) document.getElementById(anchor)?.scrollIntoView({ block: 'start' });
  else if (navigate) {
    document.querySelector(`#tab-${view}`).focus({ preventScroll: true });
    document.querySelector('.tabs').scrollIntoView({ block: 'start' });
  }
}

function setupTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  for (const tab of tabs) {
    tab.addEventListener('click', () => { history.replaceState(null, '', `#${tab.dataset.view}`); route(); });
    tab.addEventListener('keydown', event => {
      let index = tabs.indexOf(tab);
      if (event.key === 'ArrowRight') index = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') index = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = tabs.length - 1;
      else return;
      event.preventDefault(); tabs[index].click(); tabs[index].focus();
    });
  }
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
  updateJourney();
  const selector = document.querySelector('#lesson-select');
  selector.innerHTML = lessons.map(item => `<option value="${escape(item.id)}" ${item.id === lesson.id ? 'selected' : ''}>第 ${escape(item.week)} 周 · ${escape(item.title)}</option>`).join('');
  selector.addEventListener('change', () => {
    const target = new URL(location.href);
    target.searchParams.set('lesson', selector.value);
    target.hash = 'lesson';
    location.assign(target.href);
  });
  const renderers = { lesson: lessonView, language: languageView, quiz: quizView, tutor: tutorView, progress: progressView };
  app.innerHTML = tabViews.map(name => `<div id="panel-${name}" role="tabpanel" aria-labelledby="tab-${name}" tabindex="0" hidden>${renderers[name]()}</div>`).join('');
  bindEvents();
  setupTabs();
  route();
  window.addEventListener('hashchange', () => route(true));
} catch (error) {
  app.innerHTML = `<section class="loading"><h3>学习内容暂时无法加载</h3><p>${escape(error.message)}</p><p>请通过 HTTP 服务打开网页，并确认 data 与 docs 目录和网页一起部署。</p><button class="button" id="retry-load">重新加载</button></section>`;
  document.querySelector('#retry-load').addEventListener('click', () => location.reload());
}
