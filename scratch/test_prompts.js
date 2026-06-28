const { getRelevantKnowledge } = require('./server/knowledge');
const { buildPrompt } = require('./server/prompt');

async function test() {
  const query = "What are the rules for exams?";
  console.log(`Query: ${query}`);
  
  const retrieval = await getRelevantKnowledge(query);
  console.log(`\nRetrieved Context (Top 1):`);
  console.log(retrieval.top[0]?.content.substring(0, 200) + '...');
  
  const { systemPrompt, userPrompt } = buildPrompt({
    message: query,
    context: retrieval.context,
  });
  
  console.log(`\nSystem Prompt:`);
  console.log(systemPrompt);
  
  console.log(`\nUser Prompt:`);
  console.log(userPrompt);
}

test();
