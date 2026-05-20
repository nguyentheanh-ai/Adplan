export type PlannerQuestion = {
  id: string;
  question: string;
  suggestions: string[];
};

export const plannerQuestions: PlannerQuestion[] = [
  {
    id: "business",
    question: "Bạn đang kinh doanh sản phẩm/dịch vụ gì?",
    suggestions: ["Spa chăm sóc da", "Khóa học online", "Quán ăn địa phương"]
  },
  {
    id: "customer",
    question: "Khách hàng chính của bạn là ai?",
    suggestions: ["Nữ 25-40 tuổi", "Chủ shop online", "Phụ huynh có con nhỏ"]
  },
  {
    id: "location",
    question: "Khách hàng của bạn ở khu vực nào?",
    suggestions: ["TP.HCM", "Hà Nội", "Toàn quốc"]
  },
  {
    id: "price",
    question: "Mức giá sản phẩm/dịch vụ của bạn là bao nhiêu?",
    suggestions: ["300.000 - 700.000đ", "1 - 3 triệu", "Theo gói tư vấn"]
  },
  {
    id: "goal",
    question: "Mục tiêu quảng cáo chính là gì: inbox, lead, traffic, sale, nhận diện?",
    suggestions: ["Inbox", "Lead", "Sale"]
  },
  {
    id: "budget",
    question: "Ngân sách dự kiến mỗi ngày hoặc mỗi tháng là bao nhiêu?",
    suggestions: ["300.000đ/ngày", "10 triệu/tháng", "Chưa chắc chắn"]
  },
  {
    id: "assets",
    question: "Bạn đã có fanpage, website hoặc landing page chưa?",
    suggestions: ["Có fanpage", "Có website", "Chưa có"]
  },
  {
    id: "strength",
    question: "Điểm mạnh nhất của sản phẩm/dịch vụ là gì?",
    suggestions: ["Kết quả nhanh", "Giá tốt", "Đội ngũ chuyên môn cao"]
  },
  {
    id: "objection",
    question: "Khách hàng thường từ chối hoặc phân vân vì lý do gì?",
    suggestions: ["Sợ không hiệu quả", "So sánh giá", "Cần hỏi người thân"]
  }
];

export type PlannerAnswer = {
  question: string;
  answer: string;
};

export function buildAnswersFromMap(answerMap: Record<string, string>): PlannerAnswer[] {
  return plannerQuestions
    .map((item) => ({
      question: item.question,
      answer: answerMap[item.id]?.trim() ?? ""
    }))
    .filter((item) => item.answer.length > 0);
}
