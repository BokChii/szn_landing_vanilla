export default {
    "test_metadata": {
        "title": "스토릿 성향 테스트",
        "version": "1.0",
        "description": "사용자의 웹툰 취향을 분석하여 최적의 장르를 추천해 드려요!",
        "genres": [
            "romance",
            "fantasy",
            "action",
            "thriller",
            "slice",
            "martial_arts"
        ]
    },
    "questions": [
        {
            "id": 1,
            "text": "나른한 주말 아침, 웹툰 앱을 켜자마자 내 손가락이 멈춘 썸네일은?",
            "options": [
                {
                    "text": "포근한 햇살 아래, 보기만 해도 광대 승천하는 주인공들",
                    "scores": {
                        "slice": 1
                    }
                },
                {
                    "text": "화려한 이펙트! 당장이라도 화면을 뚫고 나올 듯 역동적인 모습",
                    "scores": {
                        "action": 1,
                        "martial_arts": 1
                    }
                },
                {
                    "text": "묘하게 흐르는 텐션... 두 사람의 눈맞춤에 내 심장도 반응함",
                    "scores": {
                        "romance": 1
                    }
                },
                {
                    "text": "거대한 성과 신비로운 마법, 일단 클릭하고 싶은 웅장한 배경",
                    "scores": {
                        "fantasy": 1
                    }
                }
            ]
        },
        {
            "id": 2,
            "text": "내가 만약 웹툰 속 주인공이라면? 가장 탐나는 '사기캐' 능력은?",
            "options": [
                {
                    "text": "한 번 본 건 절대 잊지 않는 천재적인 두뇌",
                    "scores": {
                        "thriller": 1
                    }
                },
                {
                    "text": "누구와도 금방 절친 가능! 마성의 무한 친화력",
                    "scores": {
                        "slice": 1,
                        "romance": 1
                    }
                },
                {
                    "text": "피나는 수련 끝에 얻은 압도적인 무력",
                    "scores": {
                        "martial_arts": 1,
                        "action": 1
                    }
                },
                {
                    "text": "차원을 넘나들거나 시간을 멈추는 초능력",
                    "scores": {
                        "fantasy": 1
                    }
                }
            ]
        },
        {
            "id": 3,
            "text": "웹툰 보다가 무심코 '미쳤다...' 소리 나오는 '소름' 포인트는?",
            "options": [
                {
                    "text": "전혀 예상치 못한 빌런의 정체가가 밝혀지는 순간",
                    "scores": {
                        "thriller": 1
                    }
                },
                {
                    "text": "답답하던 전개를 한 방에 날려버리는 사이다 참교육",
                    "scores": {
                        "action": 1,
                        "martial_arts": 1
                    }
                },
                {
                    "text": "주인공들 사이의 간질간질한 기류가 마침내 폭발할 때",
                    "scores": {
                        "romance": 1
                    }
                },
                {
                    "text": "방대한 세계관 속 숨겨진 복선들이 딱딱 맞아떨어질 때",
                    "scores": {
                        "fantasy": 1
                    }
                }
            ]
        },
        {
            "id": 4,
            "text": "내가 가장 선호하는 이야기의 호흡(전개 속도)은?",
            "options": [
                {
                    "text": "느긋하게 흘러가며 소소한 웃음을 주는 힐링 전개",
                    "scores": {
                        "slice": 1
                    }
                },
                {
                    "text": "앞뒤 잴 거 없다! 숨 쉴 틈 없이 휘몰아치는 전개",
                    "scores": {
                        "action": 2
                    }
                },
                {
                    "text": "빌드업을 차곡차곡 쌓아 마지막에 큰 거 한 방 터뜨리는 전개",
                    "scores": {
                        "thriller": 1,
                        "fantasy": 1
                    }
                },
                {
                    "text": "고난과 시련을 겪으며 천천히, 하지만 확실하게 강해지는 전개",
                    "scores": {
                        "martial_arts": 1
                    }
                }
            ]
        },
        {
            "id": 5,
            "text": "주인공이 절체절명의 위기에 처했다! 내가 바라는 다음 장면은?",
            "options": [
                {
                    "text": "동료들과의 끈끈한 우정과 사랑으로 함께 극복한다",
                    "scores": {
                        "romance": 1,
                        "slice": 1
                    }
                },
                {
                    "text": "숨겨둔 비기나 새로운 힘을 각성해 짜릿하게 역전한다",
                    "scores": {
                        "martial_arts": 1,
                        "fantasy": 1
                    }
                },
                {
                    "text": "화려한 컨트롤과 압도적인 피지컬로 적을 제압한다",
                    "scores": {
                        "action": 1
                    }
                },
                {
                    "text": "주변 단서들을 조합해 영리하게 함정에서 빠져나간다",
                    "scores": {
                        "thriller": 1
                    }
                }
            ]
        },
        {
            "id": 6,
            "text": "마지막 화를 보고 앱을 닫을 때, 어떤 기분이 드는 웹툰이 좋아?",
            "options": [
                {
                    "text": "마음이 몽글몽글해지고 제대로 힐링 받은 기분",
                    "scores": {
                        "slice": 1,
                        "romance": 1
                    }
                },
                {
                    "text": "전설적인 영웅의 일대기를 끝까지 함께한 듯한 벅찬 기분",
                    "scores": {
                        "martial_arts": 1,
                        "fantasy": 1
                    }
                },
                {
                    "text": "손에 땀을 쥐게 하던 긴장이 풀리며 카타르시스가 느껴지는 기분",
                    "scores": {
                        "thriller": 1,
                        "action": 1
                    }
                }
            ]
        }
    ],
    "results": {
        "romance": {
            "title": "설렘 농도 200%, 인간 멜로 탐지기",
            "sub_title": "너, 주인공들 눈빛만 봐도 다 알지?",
            "description": "찰나의 감정선과 미묘한 텐션을 찾아내는 데 천재적인 감각을 가졌어. 너의 그 섬세한 '설렘 레이더'라면 스토릿의 케미 퀴즈쯤은 가뿐하게 올클리어하고 리워드 싹쓸이할걸?",
            "stats": {
                "focus": 60,
                "reasoning": 40,
                "empathy": 100,
                "reflex": 50,
                "inner_power": 40
            },
            "best_match": "romance",
            "mascot_visual": "분홍빛 배경, 꽃다발이나 연애편지를 든 수줍은 모습"
        },
        "fantasy": {
            "title": "현생보다 이세계가 익숙한 모험가",
            "sub_title": "너 솔직히 마법 주문 하나쯤은 외우잖아.",
            "description": "방대한 세계관과 복잡한 설정도 너에게는 놀이터일 뿐! 떡밥 회수 실력이 거의 작가님 급이야. 스토릿에 숨겨진 고난도 설정 퀴즈 풀고, '이세계급' 리워드 보상을 쟁취해 봐.",
            "stats": {
                "focus": 80,
                "reasoning": 70,
                "empathy": 50,
                "reflex": 60,
                "inner_power": 90
            },
            "best_match": "fantasy",
            "mascot_visual": "신비로운 숲 배경, 지팡이와 망토를 두른 신비로운 모습"
        },
        "action": {
            "title": "타격감 중독! 아드레날린 헌터",
            "sub_title": "화려한 액션이 너를 감싸네.",
            "description": "고구마는 사절, 속 시원한 한 방과 짜릿한 연출에 반응하는 타입이야. 네 눈은 이미 2배속 모드! 스토릿의 스피드 퀴즈에서 네 순발력을 증명하고 리워드 랭킹 1위를 찍어보자.",
            "stats": {
                "focus": 70,
                "reasoning": 30,
                "empathy": 40,
                "reflex": 100,
                "inner_power": 80
            },
            "best_match": "action",
            "mascot_visual": "도심 야경 배경, 테크웨어를 입고 역동적인 포즈"
        },
        "thriller": {
            "title": "반전 빌런도 벌벌 떨게 할 명탐정",
            "sub_title": "범인은 이 안에 있어. (이미 다 앎)",
            "description": "사소한 복선 하나도 놓치지 않는 예리한 관찰력의 소유자구나. 소름 돋는 반전이 올 때까지 기다리는 그 긴장감을 즐길 줄 알아. 스토릿의 단서 추리 퀴즈로 네 명석함을 뽐내고 포인트를 독식해 봐.",
            "stats": {
                "focus": 90,
                "reasoning": 100,
                "empathy": 30,
                "reflex": 60,
                "inner_power": 50
            },
            "best_match": "thriller",
            "mascot_visual": "안개 낀 골목 배경, 바바리코트와 돋보기를 든 모습"
        },
        "slice": {
            "title": "무해한 웃음 사냥꾼, 힐링 마스터",
            "sub_title": "세상은 넓고 귀여운 건 많다!",
            "description": "소소한 일상 속 공감 포인트와 피식 터지는 개그 코드를 사랑하는 평화주의자야. 복잡한 건 딱 질색! 스토릿에서 가볍게 퀴즈 풀고, 소소하지만 확실한 리워드로 오늘 하루를 힐링해 봐.",
            "stats": {
                "focus": 40,
                "reasoning": 30,
                "empathy": 90,
                "reflex": 40,
                "inner_power": 60
            },
            "best_match": "slice",
            "mascot_visual": "포근한 방 배경, 잠옷 차림으로 머그컵을 든 모습"
        },
        "martial_arts": {
            "title": "강호를 평정할 퀴즈 문주",
            "sub_title": "네 안의 내공이 심상치 않다...",
            "description": "정파와 사파를 넘나드는 의리와 기개, 그리고 끝없는 수련의 맛을 아는 고수구나. 탄탄한 기본기로 무장한 너에게 스토릿 퀴즈는 식은 죽 먹기지. 어서 와서 네 내공을 증명하고 천하제일 리워드를 거머쥐어!",
            "stats": {
                "focus": 70,
                "reasoning": 50,
                "empathy": 60,
                "reflex": 80,
                "inner_power": 100
            },
            "best_match": "martial_arts",
            "mascot_visual": "대나무 숲 배경, 도복을 입고 삿갓을 쓴 고수의 모습"
        }
    }
};