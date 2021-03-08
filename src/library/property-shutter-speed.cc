#include "property-shutter-speed.h"
#include "types.h"
#include "api-error.h"
#include "utility.h"
#include <unordered_map>
#include <cmath>
#include <iostream>

namespace CameraApi {

    LabelMap NamedShutterSpeedValueLabels = {
        {0x00, "Auto"},
        {0xFFFFFFFF, "NotValid"},
        {0x0C, "Bulb"}
    };

    std::unordered_map<int, double> ShutterSpeedValues = {
        {0x10, 30},
        {0x13, 25},
        {0x14, 20},
        {0x15, 20}, // (1/3)
        {0x18, 15},
        {0x1B, 13},
        {0x1C, 10},
        {0x1D, 10},// (1/3)
        {0x20, 8},
        {0x23, 6},// (1/3)
        {0x24, 6},
        {0x25, 5},
        {0x28, 4},
        {0x2B, 3.2},
        {0x2C, 3},
        {0x2D, 2.5},
        {0x30, 2},
        {0x33, 1.6},
        {0x34, 1.5},
        {0x35, 1.3},
        {0x38, 1},
        {0x3B, 0.8},
        {0x3C, 0.7},
        {0x3D, 0.6},
        {0x40, 0.5},
        {0x43, 0.4},
        {0x44, 0.3},
        {0x45, 0.3}, // (1/3)
        {0x48, (1.0/4)},
        {0x4B, (1.0/5)},
        {0x4C, (1.0/6)},
        {0x4D, (1.0/6)}, // (1/3)
        {0x50, (1.0/8)},
        {0x53, (1.0/10)}, // (1/3)
        {0x54, (1.0/10)},
        {0x55, (1.0/13)},
        {0x58, (1.0/15)},
        {0x5B, (1.0/20)}, // (1/3)
        {0x5C, (1.0/25)},
        {0x5D, (1.0/25)},
        {0x60, (1.0/30)},
        {0x63, (1.0/40)},
        {0x64, (1.0/45)},
        {0x65, (1.0/50)},
        {0x68, (1.0/60)},
        {0x6B, (1.0/80)},
        {0x6C, (1.0/90)},
        {0x6D, (1.0/100)},
        {0x70, (1.0/125)},
        {0x73, (1.0/160)},
        {0x74, (1.0/180)},
        {0x75, (1.0/200)},
        {0x78, (1.0/250)},
        {0x7B, (1.0/320)},
        {0x7C, (1.0/350)},
        {0x7D, (1.0/400)},
        {0x80, (1.0/500)},
        {0x83, (1.0/640)},
        {0x84, (1.0/750)},
        {0x85, (1.0/800)},
        {0x88, (1.0/1000)},
        {0x8B, (1.0/1250)},
        {0x8C, (1.0/1500)},
        {0x8D, (1.0/1600)},
        {0x90, (1.0/2000)},
        {0x93, (1.0/2500)},
        {0x94, (1.0/3000)},
        {0x95, (1.0/3200)},
        {0x98, (1.0/4000)},
        {0x9B, (1.0/5000)},
        {0x9C, (1.0/6000)},
        {0x9D, (1.0/6400)},
        {0xA0, (1.0/8000)}
    };

    Napi::FunctionReference PropertyShutterSpeed::constructor;

    PropertyShutterSpeed::PropertyShutterSpeed(const Napi::CallbackInfo &info)
        : Napi::ObjectWrap<PropertyShutterSpeed>(info) {

        Napi::Env env = info.Env();
        Napi::HandleScope scope(env);

        if (info.Length() > 0 && info[0].IsNumber()) {
            value_ = info[0].As<Napi::Number>().Int32Value();
        } else {
            throw Napi::TypeError::New(
                info.Env(), "PropertyShutterSpeed: Argument 0 must be an property value."
            );
        }

        if (ShutterSpeedValues.find(value_) != ShutterSpeedValues.end()) {
            seconds_ = ShutterSpeedValues[value_];
        } else {
            seconds_ = 0;
        }
    }

    std::string PropertyShutterSpeed::GetLabelForValue(EdsInt32 value) {
        if (NamedShutterSpeedValueLabels.find(value) != NamedShutterSpeedValueLabels.end()) {
            return NamedShutterSpeedValueLabels[value];
        } else if (ShutterSpeedValues.find(value) != ShutterSpeedValues.end()) {
            return PropertyShutterSpeed::GetLabelForSeconds(ShutterSpeedValues[value]);
        }
        return "";
    }

    std::string PropertyShutterSpeed::GetLabelForSeconds(double seconds) {
        std::string label = "";
        if (seconds > 0.2999) {
            label = stringFormat("%01.1f", seconds);
            int labelLength = label.length();
            if (label.substr( labelLength - 2).compare(".0") == 0) {
                label.erase(labelLength - 2);
            }
        } else if (seconds > 0.0) {
            int fraction = std::round(1.0 / seconds);
            label = stringFormat("1/%d", fraction);
        }
        return label;
    }

    Napi::Value PropertyShutterSpeed::GetLabel(const Napi::CallbackInfo &info) {
        return Napi::String::New(info.Env(), GetLabelForValue(value_));
    }

    Napi::Value PropertyShutterSpeed::GetValue(const Napi::CallbackInfo &info) {
        return Napi::Number::New(info.Env(), value_);
    }

    Napi::Value PropertyShutterSpeed::GetSeconds(const Napi::CallbackInfo &info) {
        return Napi::Number::New(info.Env(), seconds_);
    }

    Napi::Value PropertyShutterSpeed::GetPrimitive(const Napi::CallbackInfo &info) {
        if (info.Length() > 0 && info[0].IsString()) {
            std::string hint = info[0].As<Napi::String>().Utf8Value();
            if (hint.compare("number") == 0) {
                return GetValue(info);
            }
            if (hint.compare("string") == 0) {
                return GetLabel(info);
            }
        }
        return info.Env().Null();
    }

    Napi::Value PropertyShutterSpeed::ToJSON(const Napi::CallbackInfo &info) {
        Napi::Env env = info.Env();
        Napi::Object Json = Napi::Object::New(env);
        Json.Set("label", GetLabel(info));
        Json.Set("value", GetValue(info));
        Json.Set("seconds", GetSeconds(info));
        return Json;
    }

    Napi::Value PropertyShutterSpeed::ToStringTag(const Napi::CallbackInfo &info) {
        return Napi::String::New(info.Env(), "PropertyShutterSpeed");
    }

    Napi::Value PropertyShutterSpeed::Inspect(const Napi::CallbackInfo &info) {
        auto env = info.Env();
        auto stylize = info[1].As<Napi::Object>().Get("stylize").As<Napi::Function>();
        std::string output = stylize.Call(
            {Napi::String::New(env, "PropertyShutterSpeed"), Napi::String::New(env, "special")}
        ).As<Napi::String>().Utf8Value();
        output.append(" <");
        output.append(
            stylize.Call(
                {GetLabel(info), Napi::String::New(env, "string")}
            ).As<Napi::String>().Utf8Value()
        );
        output.append(">");
        return Napi::String::New(env, output);
    }

    Napi::Value PropertyShutterSpeed::ForLabel(const Napi::CallbackInfo &info) {
        if (!(info.Length() > 0 && info[0].IsString())) {
            throw Napi::TypeError::New(
                info.Env(), "PropertyShutterSpeed::forLabel(): Argument 0 must be a string."
            );
        }
        std::string label = info[0].As<Napi::String>().Utf8Value();
        for (const auto &it : NamedShutterSpeedValueLabels) {
            if (it.second.compare(label) == 0) {
                return PropertyShutterSpeed::NewInstance(info.Env(), it.first);
            }
        }
        try {
            double seconds;
            int fractionAt = label.find("1/");
            if (fractionAt != std::string::npos) {
                if (fractionAt > 1) {
                    seconds = std::stod(label.substr(0, fractionAt));
                } else {
                    seconds = 0;
                }
                seconds += 1.0 / std::stod(label.substr(fractionAt + 2));
            } else {
                seconds = std::stod(label);
            }
            double matchDelta = 9999.0;
            EdsInt32 matchValue = 0;
            for (const auto &it : ShutterSpeedValues) {
                double delta = std::abs(seconds - it.second);
                if (delta < matchDelta) {
                    matchDelta = delta;
                    matchValue = it.first;
                }
            }
            return PropertyShutterSpeed::NewInstance(info.Env(), matchValue);
        } catch (...) {
            throw Napi::TypeError::New(
                info.Env(), "PropertyShutterSpeed::forLabel(): Invalid label value."
            );
        }
    }

    Napi::Object PropertyShutterSpeed::NewInstance(Napi::Env env, EdsInt32 value) {
        Napi::EscapableHandleScope scope(env);
        Napi::Object wrap = constructor.New(
            {
                Napi::Number::New(env, value)
            }
        );
        return scope.Escape(napi_value(wrap)).ToObject();
    }

    void PropertyShutterSpeed::Init(Napi::Env env, Napi::Object exports) {
        Napi::HandleScope scope(env);

        Napi::Object IDs = Napi::Object::New(env);
        for (const auto &it : NamedShutterSpeedValueLabels) {
            IDs.DefineProperty(
                Napi::PropertyDescriptor::Value(
                    it.second.c_str(), Napi::Number::New(env, it.first), napi_enumerable
                )
            );
        }
        Napi::Object Values = Napi::Object::New(env);
        for (const auto &it : ShutterSpeedValues) {
            Values.Set(it.first, it.second);
        }

        std::vector <PropertyDescriptor> properties = {
            InstanceAccessor<&PropertyShutterSpeed::GetLabel>("label"),
            InstanceAccessor<&PropertyShutterSpeed::GetValue>("value"),
            InstanceAccessor<&PropertyShutterSpeed::GetSeconds>("seconds"),

            InstanceMethod(Napi::Symbol::WellKnown(env, "toPrimitive"), &PropertyShutterSpeed::GetPrimitive),
            InstanceMethod("toJSON", &PropertyShutterSpeed::ToJSON),

            InstanceAccessor<&PropertyShutterSpeed::ToStringTag>(Napi::Symbol::WellKnown(env, "toStringTag")),
            InstanceMethod(GetPublicSymbol(env, "nodejs.util.inspect.custom"), &PropertyShutterSpeed::Inspect),

            StaticMethod<&PropertyShutterSpeed::ForLabel>("forLabel"),

            StaticValue("ID", IDs, napi_enumerable),
            StaticValue("Values", Values, napi_enumerable)
        };

        Napi::Function func = DefineClass(env, "PropertyShutterSpeed", properties);
        constructor = Napi::Persistent(func);
        constructor.SuppressDestruct();

        exports.Set("PropertyShutterSpeed", func);
    }
}