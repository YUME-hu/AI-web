import { ChatInterface } from "@/components/chat/chat-interface";

export const metadata = {
  title: "AI 助手",
  description: "基于项目库与博客内容的 AI 知识助手，支持 RAG 问答与语义搜索",
};

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="font-mono text-xs tracking-[0.3em] text-primary">
          {"// AI KNOWLEDGE ASSISTANT"}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">AI 知识助手</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          基于项目库与博客内容的检索增强问答（RAG），可以问我关于平台主人项目经历与技术能力的问题
        </p>
        <div className="divider-tactical mt-6" />
      </section>

      <ChatInterface />
    </div>
  );
}
