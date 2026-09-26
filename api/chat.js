const OpenAI=require('openai');
module.exports=async function(req,res){
 if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
 if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:'OPENAI_API_KEY is not configured'});
 try{
  const {prompt,language='الدارجة المغربية'}=req.body||{};
  if(!prompt) return res.status(400).json({error:'Prompt required'});
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const response=await client.responses.create({
   model:'gpt-5-mini',
   input:[{role:'system',content:'أنت مساعد عملي للمستخدمين في المغرب. أجب بلغة المستخدم المطلوبة: '+language+'. كن واضحاً ومختصراً، ولا تخترع معلومات رسمية.'},{role:'user',content:prompt}]
  });
  return res.status(200).json({answer:response.output_text});
 }catch(e){return res.status(500).json({error:'AI service error'});}
};