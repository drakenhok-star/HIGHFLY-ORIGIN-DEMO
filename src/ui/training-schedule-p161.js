/** HIGHFLY P16.1 training preview. Public schedule only, NO user's kg/RM/personal profile.
 * Source: owner-authored Training Core routine contract
 * drakentzy07/cobalt-hollow-lab @ highfly-training-run1j: training/runtime/personal_routine.ts
 * View model only: DOES NOT compute/award verified training progression.
 */
export const HIGHFLY_TRAINING_SCHEDULE_ID = 'HF_HIGHFLY_PERSONAL_5D_V1';
export const HIGHFLY_TRAINING_WEEKS = Object.freeze([
  {week:1,block:'Carga'},{week:2,block:'Carga'},{week:3,block:'Carga'},{week:4,block:'Descarga'}
]);
export const HIGHFLY_TRAINING_DAYS = [
  {
    "day": 1,
    "name": "Pierna + Hombro (Estabilidad)",
    "exercises": [
      {
        "id": "d1_hang_power_clean",
        "label": "Hang Power Clean",
        "intent": "power",
        "authority": "system_percent",
        "restSec": 150,
        "target": "Explosivo · técnica limpia",
        "weekly": [
          {
            "sets": 4,
            "reps": 3,
            "percent": 0.7
          },
          {
            "sets": 4,
            "reps": 3,
            "percent": 0.75
          },
          {
            "sets": 4,
            "reps": 2,
            "percent": 0.8
          },
          {
            "sets": 3,
            "reps": 3,
            "percent": 0.65
          }
        ]
      },
      {
        "id": "d1_back_squat_top",
        "label": "Sentadilla Top Set",
        "intent": "strength",
        "authority": "system_percent",
        "restSec": 180,
        "target": "Top set de fuerza",
        "weekly": [
          {
            "sets": 1,
            "reps": 6,
            "percent": 0.8
          },
          {
            "sets": 1,
            "reps": 4,
            "percent": 0.85
          },
          {
            "sets": 1,
            "reps": 2,
            "percent": 0.9
          },
          null
        ]
      },
      {
        "id": "d1_back_squat",
        "label": "Sentadilla",
        "intent": "strength",
        "authority": "system_percent",
        "restSec": 180,
        "target": "Back-off de fuerza",
        "weekly": [
          {
            "sets": 3,
            "reps": 6,
            "percent": 0.7
          },
          {
            "sets": 3,
            "reps": 4,
            "percent": 0.75
          },
          {
            "sets": 3,
            "reps": 2,
            "percent": 0.8
          },
          {
            "sets": 3,
            "reps": 5,
            "percent": 0.7
          }
        ]
      },
      {
        "id": "d1_zercher_squat",
        "label": "Zercher Sentadilla",
        "intent": "strength",
        "authority": "system_fixed",
        "restSec": 180,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 8
          },
          {
            "sets": 3,
            "reps": 6
          },
          {
            "sets": 3,
            "reps": 4
          },
          {
            "sets": 3,
            "reps": 5
          }
        ]
      },
      {
        "id": "d1_hamstrings",
        "label": "Isquios",
        "intent": "hypertrophy",
        "authority": "editable_accessory",
        "restSec": 90,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 15
          },
          {
            "sets": 3,
            "reps": 12
          },
          {
            "sets": 3,
            "reps": 10
          },
          {
            "sets": 2,
            "reps": 15
          }
        ]
      },
      {
        "id": "d1_lateral_raise",
        "label": "Elevaciones laterales",
        "intent": "accessory",
        "authority": "editable_accessory",
        "restSec": 75,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 20
          },
          {
            "sets": 3,
            "reps": 15
          },
          {
            "sets": 3,
            "reps": 12
          },
          {
            "sets": 2,
            "reps": 15
          }
        ]
      },
      {
        "id": "d1_facepull",
        "label": "Facepull",
        "intent": "accessory",
        "authority": "editable_accessory",
        "restSec": 75,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 20
          },
          {
            "sets": 3,
            "reps": 18
          },
          {
            "sets": 3,
            "reps": 15
          },
          {
            "sets": 2,
            "reps": 20
          }
        ]
      }
    ]
  },
  {
    "day": 2,
    "name": "Pecho + Hombro",
    "exercises": [
      {
        "id": "d2_push_press",
        "label": "Push Press",
        "intent": "power",
        "authority": "system_percent",
        "restSec": 150,
        "target": "",
        "weekly": [
          {
            "sets": 5,
            "reps": 2,
            "percent": 0.75
          },
          {
            "sets": 5,
            "reps": 2,
            "percent": 0.8
          },
          {
            "sets": 4,
            "reps": 2,
            "percent": 0.85
          },
          {
            "sets": 3,
            "reps": 2,
            "percent": 0.65
          }
        ]
      },
      {
        "id": "d2_bench_top",
        "label": "Banco Plano Top Set",
        "intent": "strength",
        "authority": "system_percent",
        "restSec": 180,
        "target": "",
        "weekly": [
          {
            "sets": 1,
            "reps": 6,
            "percent": 0.8
          },
          {
            "sets": 1,
            "reps": 4,
            "percent": 0.85
          },
          {
            "sets": 1,
            "reps": 2,
            "percent": 0.9
          },
          null
        ]
      },
      {
        "id": "d2_bench",
        "label": "Banco Plano",
        "intent": "strength",
        "authority": "system_percent",
        "restSec": 180,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 6,
            "percent": 0.7
          },
          {
            "sets": 3,
            "reps": 4,
            "percent": 0.75
          },
          {
            "sets": 3,
            "reps": 2,
            "percent": 0.8
          },
          {
            "sets": 3,
            "reps": 5,
            "percent": 0.7
          }
        ]
      },
      {
        "id": "d2_incline_db",
        "label": "Banco Inclinado Mancuernas",
        "intent": "hypertrophy",
        "authority": "editable_accessory",
        "restSec": 90,
        "target": "",
        "weekly": [
          {
            "sets": 4,
            "reps": 10
          },
          {
            "sets": 4,
            "reps": 8
          },
          {
            "sets": 4,
            "reps": 6
          },
          {
            "sets": 3,
            "reps": 10
          }
        ]
      },
      {
        "id": "d2_db_row",
        "label": "Remo con Mancuernas",
        "intent": "hypertrophy",
        "authority": "editable_accessory",
        "restSec": 90,
        "target": "",
        "weekly": [
          {
            "sets": 4,
            "reps": 10
          },
          {
            "sets": 4,
            "reps": 8
          },
          {
            "sets": 4,
            "reps": 6
          },
          {
            "sets": 3,
            "reps": 10
          }
        ]
      },
      {
        "id": "d2_military_db",
        "label": "Press Militar Mancuernas",
        "intent": "hypertrophy",
        "authority": "editable_accessory",
        "restSec": 90,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 12
          },
          {
            "sets": 3,
            "reps": 10
          },
          {
            "sets": 3,
            "reps": 8
          },
          {
            "sets": 2,
            "reps": 12
          }
        ]
      },
      {
        "id": "d2_gironda_row",
        "label": "Remo Gironda",
        "intent": "hypertrophy",
        "authority": "editable_accessory",
        "restSec": 90,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 10
          },
          {
            "sets": 3,
            "reps": 8
          },
          {
            "sets": 3,
            "reps": 6
          },
          {
            "sets": 2,
            "reps": 10
          }
        ]
      },
      {
        "id": "d2_arms",
        "label": "Tríceps + bíceps",
        "intent": "accessory",
        "authority": "editable_accessory",
        "restSec": 75,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 15
          },
          {
            "sets": 3,
            "reps": 12
          },
          {
            "sets": 3,
            "reps": 10
          },
          {
            "sets": 2,
            "reps": 15
          }
        ]
      }
    ]
  },
  {
    "day": 3,
    "name": "Front + Potencia",
    "exercises": [
      {
        "id": "d3_hang_power_clean",
        "label": "Hang Power Clean",
        "intent": "power",
        "authority": "system_percent",
        "restSec": 150,
        "target": "",
        "weekly": [
          {
            "sets": 4,
            "reps": 3,
            "percent": 0.6
          },
          {
            "sets": 4,
            "reps": 3,
            "percent": 0.65
          },
          {
            "sets": 4,
            "reps": 3,
            "percent": 0.7
          },
          {
            "sets": 3,
            "reps": 3,
            "percent": 0.6
          }
        ]
      },
      {
        "id": "d3_deadlift_top",
        "label": "Peso Muerto / Rack Pull Top Set",
        "intent": "strength",
        "authority": "system_percent",
        "restSec": 180,
        "target": "",
        "weekly": [
          {
            "sets": 1,
            "reps": 3,
            "percent": 0.85
          },
          {
            "sets": 1,
            "reps": 2,
            "percent": 0.9
          },
          {
            "sets": 1,
            "reps": 1,
            "percent": 0.95
          },
          null
        ]
      },
      {
        "id": "d3_deadlift",
        "label": "Peso Muerto / Rack Pull",
        "intent": "strength",
        "authority": "system_percent",
        "restSec": 180,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 5,
            "percent": 0.75
          },
          {
            "sets": 3,
            "reps": 4,
            "percent": 0.8
          },
          {
            "sets": 3,
            "reps": 3,
            "percent": 0.85
          },
          {
            "sets": 3,
            "reps": 5,
            "percent": 0.7
          }
        ]
      },
      {
        "id": "d3_pendlay",
        "label": "Remo Pendlay",
        "intent": "strength",
        "authority": "system_percent",
        "restSec": 180,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 8,
            "percent": 0.6
          },
          {
            "sets": 3,
            "reps": 6,
            "percent": 0.65
          },
          {
            "sets": 3,
            "reps": 4,
            "percent": 0.7
          },
          {
            "sets": 2,
            "reps": 8,
            "percent": 0.6
          }
        ]
      },
      {
        "id": "d3_leg_press",
        "label": "Prensa",
        "intent": "hypertrophy",
        "authority": "editable_accessory",
        "restSec": 90,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 15
          },
          {
            "sets": 3,
            "reps": 12
          },
          {
            "sets": 3,
            "reps": 10
          },
          {
            "sets": 2,
            "reps": 15
          }
        ]
      },
      {
        "id": "d3_quads",
        "label": "Cuádriceps",
        "intent": "accessory",
        "authority": "editable_accessory",
        "restSec": 75,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 25
          },
          {
            "sets": 3,
            "reps": 20
          },
          {
            "sets": 3,
            "reps": 15
          },
          {
            "sets": 2,
            "reps": 25
          }
        ]
      },
      {
        "id": "d3_hamstrings",
        "label": "Isquios",
        "intent": "hypertrophy",
        "authority": "editable_accessory",
        "restSec": 90,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 15
          },
          {
            "sets": 3,
            "reps": 12
          },
          {
            "sets": 3,
            "reps": 10
          },
          {
            "sets": 2,
            "reps": 15
          }
        ]
      }
    ]
  },
  {
    "day": 4,
    "name": "Hombros (Fuerza + Completo)",
    "exercises": [
      {
        "id": "d4_push_press",
        "label": "Push Press",
        "intent": "power",
        "authority": "system_percent",
        "restSec": 150,
        "target": "",
        "weekly": [
          {
            "sets": 4,
            "reps": 3,
            "percent": 0.7
          },
          {
            "sets": 4,
            "reps": 3,
            "percent": 0.75
          },
          {
            "sets": 4,
            "reps": 2,
            "percent": 0.8
          },
          {
            "sets": 3,
            "reps": 3,
            "percent": 0.65
          }
        ]
      },
      {
        "id": "d4_military_top",
        "label": "Press Militar Top Set",
        "intent": "strength",
        "authority": "system_percent",
        "restSec": 180,
        "target": "",
        "weekly": [
          {
            "sets": 1,
            "reps": 6,
            "percent": 0.8
          },
          {
            "sets": 1,
            "reps": 4,
            "percent": 0.85
          },
          {
            "sets": 1,
            "reps": 2,
            "percent": 0.9
          },
          null
        ]
      },
      {
        "id": "d4_military",
        "label": "Press Militar",
        "intent": "strength",
        "authority": "system_percent",
        "restSec": 180,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 6,
            "percent": 0.7
          },
          {
            "sets": 3,
            "reps": 4,
            "percent": 0.75
          },
          {
            "sets": 3,
            "reps": 2,
            "percent": 0.8
          },
          {
            "sets": 3,
            "reps": 5,
            "percent": 0.7
          }
        ]
      },
      {
        "id": "d4_incline_barbell",
        "label": "Banco Inclinado con Barra",
        "intent": "strength",
        "authority": "system_percent",
        "restSec": 180,
        "target": "",
        "weekly": [
          {
            "sets": 4,
            "reps": 8,
            "percent": 0.6
          },
          {
            "sets": 4,
            "reps": 6,
            "percent": 0.65
          },
          {
            "sets": 4,
            "reps": 4,
            "percent": 0.7
          },
          {
            "sets": 3,
            "reps": 8,
            "percent": 0.6
          }
        ]
      },
      {
        "id": "d4_lat_pulldown",
        "label": "Jalón al pecho",
        "intent": "hypertrophy",
        "authority": "editable_accessory",
        "restSec": 90,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 10
          },
          {
            "sets": 3,
            "reps": 8
          },
          {
            "sets": 3,
            "reps": 6
          },
          {
            "sets": 2,
            "reps": 10
          }
        ]
      },
      {
        "id": "d4_military_machine",
        "label": "Press Militar Máquina",
        "intent": "hypertrophy",
        "authority": "editable_accessory",
        "restSec": 90,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 15
          },
          {
            "sets": 3,
            "reps": 12
          },
          {
            "sets": 3,
            "reps": 10
          },
          {
            "sets": 2,
            "reps": 15
          }
        ]
      },
      {
        "id": "d4_gironda_row",
        "label": "Remo Gironda",
        "intent": "hypertrophy",
        "authority": "editable_accessory",
        "restSec": 90,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 12
          },
          {
            "sets": 3,
            "reps": 10
          },
          {
            "sets": 3,
            "reps": 8
          },
          {
            "sets": 2,
            "reps": 12
          }
        ]
      },
      {
        "id": "d4_arms",
        "label": "Tríceps + bíceps",
        "intent": "accessory",
        "authority": "editable_accessory",
        "restSec": 75,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 15
          },
          {
            "sets": 3,
            "reps": 12
          },
          {
            "sets": 3,
            "reps": 10
          },
          {
            "sets": 2,
            "reps": 15
          }
        ]
      }
    ]
  },
  {
    "day": 5,
    "name": "Posterior + Fuerza",
    "exercises": [
      {
        "id": "d5_hang_power_clean",
        "label": "Hang Power Clean",
        "intent": "power",
        "authority": "system_percent",
        "restSec": 150,
        "target": "",
        "weekly": [
          {
            "sets": 5,
            "reps": 2,
            "percent": 0.75
          },
          {
            "sets": 5,
            "reps": 2,
            "percent": 0.8
          },
          {
            "sets": 4,
            "reps": 2,
            "percent": 0.85
          },
          {
            "sets": 3,
            "reps": 2,
            "percent": 0.65
          }
        ]
      },
      {
        "id": "d5_front_squat_top",
        "label": "Sentadilla Frontal Top Set",
        "intent": "strength",
        "authority": "system_percent",
        "restSec": 180,
        "target": "",
        "weekly": [
          {
            "sets": 1,
            "reps": 6,
            "percent": 0.8
          },
          {
            "sets": 1,
            "reps": 4,
            "percent": 0.85
          },
          {
            "sets": 1,
            "reps": 2,
            "percent": 0.9
          },
          null
        ]
      },
      {
        "id": "d5_front_squat",
        "label": "Sentadilla Frontal",
        "intent": "strength",
        "authority": "system_percent",
        "restSec": 180,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 6,
            "percent": 0.7
          },
          {
            "sets": 3,
            "reps": 4,
            "percent": 0.75
          },
          {
            "sets": 3,
            "reps": 2,
            "percent": 0.8
          },
          {
            "sets": 3,
            "reps": 5,
            "percent": 0.7
          }
        ]
      },
      {
        "id": "d5_zercher_good_morning",
        "label": "Buenos días Zercher",
        "intent": "strength",
        "authority": "system_percent",
        "restSec": 180,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 8,
            "percent": 0.6
          },
          {
            "sets": 3,
            "reps": 6,
            "percent": 0.65
          },
          {
            "sets": 3,
            "reps": 4,
            "percent": 0.7
          },
          {
            "sets": 2,
            "reps": 8,
            "percent": 0.6
          }
        ]
      },
      {
        "id": "d5_bulgarian",
        "label": "Búlgara",
        "intent": "hypertrophy",
        "authority": "editable_accessory",
        "restSec": 90,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 8
          },
          {
            "sets": 3,
            "reps": 6
          },
          {
            "sets": 3,
            "reps": 4
          },
          {
            "sets": 2,
            "reps": 8
          }
        ]
      },
      {
        "id": "d5_front_raise",
        "label": "Elevaciones Frontales",
        "intent": "accessory",
        "authority": "editable_accessory",
        "restSec": 75,
        "target": "",
        "weekly": [
          {
            "sets": 3,
            "reps": 20
          },
          {
            "sets": 3,
            "reps": 15
          },
          {
            "sets": 3,
            "reps": 12
          },
          {
            "sets": 2,
            "reps": 15
          }
        ]
      },
      {
        "id": "d5_facepull",
        "label": "Facepull",
        "intent": "accessory",
        "authority": "editable_accessory",
        "restSec": 75,
        "target": "",
        "weekly": [
          {
            "sets": 2,
            "reps": 20
          },
          {
            "sets": 2,
            "reps": 20
          },
          {
            "sets": 2,
            "reps": 20
          },
          {
            "sets": 2,
            "reps": 20
          }
        ]
      }
    ]
  }
];
export const HIGHFLY_CORE_STAT_NAMES = Object.freeze(['STR','AGI','VIT','PER','INT']);
