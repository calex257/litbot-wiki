export type Message = {
    role: "user" | "assistant"
    content: string
    links?: string[]
    feedback?: "positive" | "negative" | null
    comment?: string
    commentSubmitted?: boolean
    id?: string
}
