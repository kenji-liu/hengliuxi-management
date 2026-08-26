import unittest
from unittest.mock import patch

from flask import Flask

from webapp import answer_engine
from webapp import management_context
from webapp import nlp_rag_api


class AnswerGroundingTests(unittest.TestCase):
    def test_retrieval_requires_the_requested_concepts(self):
        query = "人怎麼下去修補魚道"
        docs = [
            {"source_file": "最新巡查.txt", "text": "巡查紀錄 77 筆、照片 5660 張。"},
            {"source_file": "fishway-report.pdf", "text": "魚道保護工頂部鋼條修補，建議進行修補。"},
        ]

        results = answer_engine.filter_retrieved_docs(query, docs, limit=5)

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["source_file"], "fishway-report.pdf")

    def test_management_context_uses_only_fish_movement_records(self):
        result = management_context.build_management_context("怎麼知道魚有往上游", limit=6)

        self.assertIn("往上游通行", result["context"])
        self.assertGreater(len(result["evidence"]), 0)
        self.assertNotIn("照片 5660", result["context"])

    def test_facility_priority_query_does_not_receive_latest_management_list(self):
        result = management_context.build_management_context("哪些設施需要維護", limit=6)

        self.assertEqual(result["context"], "")
        self.assertEqual(result["evidence"], [])

    def test_environment_fallback_is_not_mixed_with_fish_movement_guidance(self):
        result = answer_engine.build_environment_context("人怎麼下去修補魚道")

        self.assertIn("施工進出通則", result)
        self.assertIn("非本案施工紀錄", result)
        self.assertNotIn("魚類上溯判讀通則", result)

    def test_smart_ask_uses_environment_context_instead_of_management_stats(self):
        app = Flask(__name__)
        app.register_blueprint(nlp_rag_api.nlp_rag)
        fake_results = {
            "platform": {},
            "local": [{
                "source_file": "fishway-report.pdf",
                "text": "魚道保護工頂部鋼條修補，建議進行修補。",
                "score": 0.8,
            }],
            "ocr": {},
            "management": {
                "context": "巡查紀錄 77 筆、照片 5660 張。",
                "evidence": [{"type": "inspection", "title": "巡查", "summary": "巡查正常"}],
                "counts": {"inspection_records": 77, "maintenance_photos": 5660},
            },
        }

        with patch.object(nlp_rag_api, "_run_parallel", return_value=fake_results), \
             patch.object(nlp_rag_api, "_web_search_ddg", return_value=[]), \
             patch.object(nlp_rag_api, "_opencode_go_key", return_value=""), \
             patch.object(nlp_rag_api, "_ai_synthesis_mode", return_value={"answer": "", "provider": "opencode_go"}), \
             patch.object(nlp_rag_api, "_log_ai_usage", return_value=None):
            response = app.test_client().post(
                "/api/smart-ask",
                json={"query": "人怎麼下去修補魚道", "include_cloud_ocr": False},
            )

        payload = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["llm_provider"], "environment_context")
        self.assertTrue(payload["environment_context_used"])
        self.assertEqual(payload["confidence_level"], "low")
        self.assertIn("施工進出通則", payload["answer"])
        self.assertNotIn("照片 5660", payload["answer"])
        self.assertNotIn("巡查紀錄 77 筆", payload["answer"])

    def test_smart_ask_has_direct_fallback_for_upstream_evidence(self):
        app = Flask(__name__)
        app.register_blueprint(nlp_rag_api.nlp_rag)
        fake_results = {
            "platform": {},
            "local": [{
                "source_file": "fish-survey.pdf",
                "text": "在魚道上游進水口附近設置箱型陷阱與圍網，觀察魚類通行。",
                "score": 0.8,
            }],
            "ocr": {},
            "management": {},
        }

        with patch.object(nlp_rag_api, "_run_parallel", return_value=fake_results), \
             patch.object(nlp_rag_api, "_web_search_ddg", return_value=[]), \
             patch.object(nlp_rag_api, "_opencode_go_key", return_value=""), \
             patch.object(nlp_rag_api, "_ai_synthesis_mode", return_value={"answer": "", "provider": "opencode_go"}), \
             patch.object(nlp_rag_api, "_log_ai_usage", return_value=None):
            response = app.test_client().post(
                "/api/smart-ask",
                json={"query": "怎麼知道魚有往上游", "include_cloud_ocr": False},
            )

        payload = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["llm_provider"], "retrieval_method")
        self.assertIn("箱型陷阱", payload["answer"])
        self.assertIn("上游", payload["answer"])
        self.assertIn("下游", payload["answer"])
        self.assertEqual(payload["management_evidence"], [])

    def test_smart_ask_rejects_an_off_topic_model_answer(self):
        app = Flask(__name__)
        app.register_blueprint(nlp_rag_api.nlp_rag)
        fake_results = {
            "platform": {},
            "local": [{
                "source_file": "fish-survey.pdf",
                "text": "在魚道上游進水口附近設置箱型陷阱與圍網，觀察魚類通行。",
                "score": 0.8,
            }],
            "ocr": {},
            "management": {},
        }
        with patch.object(nlp_rag_api, "_run_parallel", return_value=fake_results), \
             patch.object(nlp_rag_api, "_web_search_ddg", return_value=[]), \
             patch.object(nlp_rag_api, "_opencode_go_key", return_value="key"), \
             patch.object(nlp_rag_api, "_run_agent", return_value={"answer": "巡查紀錄 77 筆、照片 5660 張。"}), \
             patch.object(nlp_rag_api, "_ai_synthesis_mode", return_value={"answer": "巡查紀錄 77 筆、照片 5660 張。", "provider": "opencode_go"}), \
             patch.object(nlp_rag_api, "_log_ai_usage", return_value=None):
            response = app.test_client().post(
                "/api/smart-ask",
                json={"query": "怎麼知道魚有往上游", "include_cloud_ocr": False},
            )

        payload = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("照片 5660", payload["answer"])
        self.assertIn("箱型陷阱", payload["answer"])

    def test_external_results_are_filtered_to_the_query_topic(self):
        results = nlp_rag_api._filter_web_results(
            "怎麼知道魚有往上游",
            [
                {"title": "大甲溪魚道調查", "body": "上游出口設置陷阱觀察魚類通行"},
                {"title": "旅遊美食推薦", "body": "餐廳與景點資訊"},
            ],
        )

        self.assertEqual([item["title"] for item in results], ["大甲溪魚道調查"])

        access_results = nlp_rag_api._filter_web_results(
            "人怎麼下去修補魚道",
            [{
                "title": "橫流溪魚道與步道位置",
                "body": "臺中市和平區橫流溪，步道可達魚道周邊環境。",
            }],
        )
        self.assertEqual([item["title"] for item in access_results], ["橫流溪魚道與步道位置"])


if __name__ == "__main__":
    unittest.main()
