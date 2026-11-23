import asyncio

from langchain_core.documents import Document

from app.rag import PROMPT, Assistant, format_sources, to_messages


def test_sources_are_numbered_for_the_prompt_and_listed_for_the_ui():
    docs = [
        Document("Sweep often.", metadata={"source": "guide:hardwood-care.md", "title": "Hardwood care", "section": "Everyday cleaning"}),
        Document("Product: Gray Plank", metadata={"source": "catalog:3", "title": "Gray Plank", "section": "Catalog"}),
    ]
    context, sources = format_sources(docs)
    assert context.startswith("[1] Hardwood care - Everyday cleaning\nSweep often.")
    assert "[2] Gray Plank - Catalog\nProduct: Gray Plank" in context
    assert [(s.number, s.title, s.kind) for s in sources] == [(1, "Hardwood care", "guide"), (2, "Gray Plank", "catalog")]


def test_prompt_contains_rules_sources_history_and_question():
    messages = PROMPT.format_messages(
        context="[1] Hardwood care\nSweep often.",
        history=to_messages([{"role": "user", "content": "Hi"}, {"role": "assistant", "content": "Hello!"}]),
        question="How do I clean oak?",
    )
    assert [m.type for m in messages] == ["system", "human", "ai", "human"]
    assert "only the numbered sources" in messages[0].content and "[1]" in messages[0].content and "Sweep often." in messages[0].content
    assert messages[-1].content == "How do I clean oak?"


def test_stream_sends_sources_first_then_the_answer(store, fake_llm):
    async def collect():
        return [e async for e in Assistant(store, fake_llm, top_k=3).stream("How do I clean hardwood?", [])]

    events = asyncio.run(collect())
    assert events[0][0] == "sources" and len(events[0][1]) == 3
    assert "".join(v for k, v in events if k == "token") == "Sweep often and use a damp mop [1]."


def test_follow_up_questions_also_search_the_previous_question(store, fake_llm):
    assistant = Assistant(store, fake_llm, top_k=2)
    seen = []
    original = assistant.retriever.ainvoke

    async def spy(query, *args, **kwargs):
        seen.append(query)
        return await original(query, *args, **kwargs)

    object.__setattr__(assistant.retriever, "ainvoke", spy)
    history = [{"role": "user", "content": "Which floors suit basements?"}, {"role": "assistant", "content": "Vinyl or tile."}]
    asyncio.run(assistant.retrieve("What about kitchens?", history))
    assert seen == ["Which floors suit basements?\nWhat about kitchens?"]
