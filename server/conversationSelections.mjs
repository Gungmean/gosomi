import { checklistQuestions } from '../shared/formQuestions.mjs'

// These rules recognize explicit statements only. Missing context never means "아니오".
const rules = {
  fraudFamily: [/(?:상대방|피고소인|판매자)(?:은|는|이|가)?\s*(?:(?:제|저의|우리)\s*)?(?:가족|친척|사촌|친형|친누나|친오빠|친동생)(?:입니다|이에요|이야|이었|이고)/u, /(?:가족|친척|사촌).{0,8}(?:아니|아닙|없)/u],
  fraudLivedTogether: [/같이\s*살았|함께\s*살았|동거(?:했|한\s*적이?\s*있)/u, /동거.{0,10}(?:없|않)|같이\s*산\s*적.{0,5}없/u],
  fraudKnewLong: [/오래(?:전부터|동안)\s*알|\d+년(?:간|\s*동안)\s*알/u, /처음\s*(?:만난|알게|거래)|오래\s*알던\s*사이.{0,5}아니/u],
  fraudContactable: [/현재.{0,10}연락.{0,5}(?:가능|돼|됩니다)|지금도\s*연락(?:이)?\s*(?:돼|됩|가능)/u, /연락.{0,8}(?:두절|안\s*돼|안\s*됩|되지\s*않)|(?:저를|제\s*연락처를)\s*차단/u],
  fraudPreviousTrade: [/이전에도.{0,15}(?:거래|계약).{0,8}(?:했|있)|전에도.{0,8}(?:거래|계약)했/u, /(?:거래|계약).{0,8}(?:처음|한\s*적.{0,5}없)/u],
  fraudPromise: [/재산.{0,25}믿|(?:갚|변제|약속|이행).{0,25}믿어\s*달/u, /믿어\s*달라고\s*한\s*적.{0,5}없/u],
  defamationFamily: [/(?:상대방|피고소인)(?:은|는|이|가)?\s*(?:(?:제|저의|우리)\s*)?(?:가족|친척|사촌|친형|친누나|친오빠|친동생)(?:입니다|이에요|이야|이었|이고)/u, /(?:가족|친척|사촌).{0,8}(?:아니|아닙)/u],
  defamationKnown: [/아는\s*사이|직장\s*동료|(?:제|저의)\s*친구|같은\s*학교/u, /모르는\s*사람|처음\s*보는\s*사람|아는\s*사이.{0,5}(?:아니|아닙)/u],
  defamationIdentifiable: [/(?:제|저의)\s*(?:실명|이름|사진).{0,15}(?:언급했|올렸|적었|공개했)|저를\s*(?:가리|지목)|누가\s*봐도\s*저/u, /저를\s*가리키는\s*말.{0,5}아니|저인지\s*알\s*수\s*없/u],
  defamationReputation: [/평판.{0,8}(?:나빠|나쁘|떨어)|이미지.{0,8}(?:나빠|나쁘|훼손)|평가.{0,8}나쁘/u, /(?:평판|이미지|평가).{0,10}(?:영향.{0,5}없|나빠지지\s*않)/u],
  defamationPublicPlace: [/공개\s*(?:게시판|장소|채팅방)|누구나.{0,8}(?:볼|읽을)\s*수/u, /비공개\s*(?:장소|대화)|공개된\s*장소.{0,5}아니/u],
  defamationOthersKnew: [/다른\s*사람들?(?:도|이|가).{0,12}(?:봤|보았|들었|알게)|여러\s*명(?:이|도).{0,12}(?:봤|보았|들었)|단체\s*채팅방.{0,15}(?:봤|읽었)/u, /저만.{0,12}(?:봤|보았|들었|알)|다른\s*사람.{0,10}(?:아무도\s*모|알지\s*못)/u],
  defamationOneToOne: [/단둘이|둘만\s*있는|1\s*:\s*1\s*(?:채팅|대화|통화)/u, /여러\s*명(?:이|과).{0,10}(?:함께|있는)|단둘이.{0,8}(?:아니|아닙)/u],
  defamationWithdraw: [/(?:합의|원만히\s*해결|문제가\s*해결).{0,20}(?:고소를?\s*)?취소(?:할|하겠|하려)/u, /(?:합의|해결).{0,20}취소.{0,8}(?:않|없)|고소를?\s*취소할\s*의사.{0,5}없/u],
  assaultSudden: [/아무(?:런)?\s*이유\s*없이.{0,15}(?:폭행|때|맞)|갑자기.{0,10}(?:때렸|때리|폭행|맞았)/u, /갑자기\s*폭행한\s*것.{0,5}아니/u],
  assaultArgument: [/말싸움.{0,10}(?:했|있)|다투(?:고|었|다가)|시비.{0,5}붙/u, /(?:말싸움|다툼).{0,8}(?:없|않)/u],
  assaultWitness: [/목격자(?:가|는|도)?.{0,8}(?:있었|있어|있습)|주변\s*사람들?(?:이|도).{0,8}(?:봤|보았)/u, /목격자.{0,8}(?:없|않)/u],
  assaultCctv: [/CCTV(?:가|는|도)?.{0,8}(?:있었|있어|있습|설치)|CCTV\s*(?:영상|녹화).{0,8}(?:확보|있)/iu, /CCTV.{0,8}(?:없|않)/iu],
  assaultWithdraw: [/(?:합의|원만히\s*해결|문제가\s*해결).{0,20}(?:고소를?\s*)?취소(?:할|하겠|하려)/u, /(?:합의|해결).{0,20}취소.{0,8}(?:않|없)|고소를?\s*취소할\s*의사.{0,5}없/u],
  previousComplaint: [/(?:같은\s*(?:사건|내용)|이\s*사건|동일\s*사건).{0,25}(?:이미|이전|과거).{0,15}(?:고소|제출|접수)|이전에.{0,15}(?:같은\s*(?:사건|내용)).{0,15}(?:고소|제출|접수)/u, /(?:처음\s*고소|고소는?\s*처음)|(?:같은\s*(?:사건|내용)|이\s*사건).{0,25}(?:고소|제출|접수).{0,8}(?:없|않)/u],
  withdrawnComplaint: [/(?:이전|과거|예전).{0,20}(?:고소를?\s*취소했|처벌을?\s*원하지\s*않는다고\s*(?:말|표현))/u, /(?:고소를?\s*취소|처벌불원\s*의사.{0,5}표현).{0,10}(?:적.{0,4}없|하지\s*않았)/u],
}
const normalized = (text) => String(text || '').replace(/\s+/g, ' ').trim()

export function applyConversationSelections(patch, draft, messages) {
  const type = patch.type || draft?.type
  const questions = checklistQuestions[type] || []
  const userTexts = (Array.isArray(messages) ? messages : []).filter((message) => message?.role === 'user').map((message) => String(message.text || ''))
  const allText = normalized(userTexts.join('\n'))
  const selections = { ...patch.selections }, evidence = { ...patch.selectionEvidence }
  const locked = new Set(draft?.manualSelections || [])
  for (const { id } of questions) {
    if (locked.has(id)) { delete selections[id]; delete evidence[id]; continue }
    // Model answers must point to an exact excerpt in a user message.
    const quote = normalized(evidence[id])
    if (selections[id] && (!['예', '아니오', '모름'].includes(selections[id]) || !quote || !allText.includes(quote))) {
      delete selections[id]; delete evidence[id]
    }
    let explicit
    for (const text of userTexts) {
      for (const clause of text.split(/[.!?。！？\n]|하지만|그런데|그리고/u)) {
        if (/모르|불확실|인지\s*(?:알|확인)|없을\s*수|있을\s*수|있었으면|없었으면/u.test(clause.replace(/모르는\s*사람/gu, '낯선 사람'))) continue
        const [yes, no] = rules[id] || []
        if (no?.test(clause)) explicit = { value: '아니오', quote: clause.trim() }
        else if (yes?.test(clause) && !/아니|않|없|못/u.test(clause.replace(/이유\s*없이/gu, ''))) explicit = { value: '예', quote: clause.trim() }
      }
    }
    if (explicit) { selections[id] = explicit.value; evidence[id] = explicit.quote }
    else if (draft?.selections?.[id]) { delete selections[id]; delete evidence[id] }
  }
  // The visitor's own selections always take precedence, including clearing a choice.
  for (const id of locked) { delete selections[id]; delete evidence[id] }
  const next = { ...patch }
  if (Object.keys(selections).length) next.selections = selections
  else delete next.selections
  if (Object.keys(evidence).length) next.selectionEvidence = evidence
  else delete next.selectionEvidence
  return next
}
