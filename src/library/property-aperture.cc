#include "property-aperture.h"
#include "types.h"
#include "utility.h"
#include <unordered_map>
#include <iostream>

namespace CameraApi {

    LabelMap NamedApertureLabels = {
        {0x00, "Auto"},
        {0xFFFFFFFF, "NotValid"}
    };

    std::unordered_map<int, double> ApertureValues = {
        {0x08, 1},
        {0x0B, 1.1},
        {0x0C, 1.2},
        {0x0D, 1.2}, // (1/3),
        {0x10, 1.4},
        {0x13, 1.6},
        {0x14, 1.8},
        {0x15, 1.8}, // (1/3),
        {0x18, 2},
        {0x1B, 2.2},
        {0x1C, 2.5},
        {0x1D, 2.5}, // (1/3),
        {0x20, 2.8},
        {0x23, 3.2},
        {0x85, 3.4},
        {0x24, 3.5},
        {0x25, 3.5}, // (1/3),
        {0x28, 4},
        {0x2B, 4.5},
        {0x2C, 4.5},
        {0x2D, 5.0},
        {0x30, 5.6},
        {0x33, 6.3},
        {0x34, 6.7},
        {0x35, 7.1},
        {0x38, 8},
        {0x3B, 9},
        {0x3C, 9.5},
        {0x3D, 10},
        {0x40, 11},
        {0x43, 13}, // (1/3),
        {0x44, 13},
        {0x45, 14},
        {0x48, 16},
        {0x4B, 18},
        {0x4C, 19},
        {0x4D, 20},
        {0x50, 22},
        {0x53, 25},
        {0x54, 27},
        {0x55, 29},
        {0x58, 32},
        {0x5B, 36},
        {0x5C, 38},
        {0x5D, 40},
        {0x60, 45},
        {0x63, 51},
        {0x64, 54},
        {0x65, 57},
        {0x68, 64},
        {0x6B, 72},
        {0x6C, 76},
        {0x6D, 80},
        {0x70, 91}
    };

    Napi::FunctionReference PropertyAperture::constructor;

    PropertyAperture::PropertyAperture(const Napi::CallbackInfo &info)
        : Napi::ObjectWrap<PropertyAperture>(info) {

        Napi::Env env = info.Env();
        Napi::HandleScope scope(env);

        if (info.Length() > 0 && info[0].IsNumber()) {
            value_ = info[0].As<Napi::Number>().Int32Value();
        } else {
            throw Napi::TypeError::New(
                info.Env(), "PropertyAperture: Argument 0 must be an property value."
            );
        }

        if (ApertureValues.find(value_) != ApertureValues.end()) {
            f_ = ApertureValues[value_];
        } else {
            f_ = 0;
        }
    }

    std::string PropertyAperture::GetLabelForValue(EdsInt32 value) {
        if (NamedApertureLabels.find(value) != NamedApertureLabels.end()) {
            return NamedApertureLabels[value];
        } else if (ApertureValues.find(value) != ApertureValues.end()) {
            return PropertyAperture::GetLabelForAperture(ApertureValues[value]);
        }
        return "";
    }

    std::string PropertyAperture::GetLabelForAperture(double f) {
        std::string label = "";
        label = stringFormat("f%01.1f", f);
        int labelLength = label.length();
        if (label.substr(labelLength - 2).compare(".0") == 0) {
            label.erase(labelLength - 2);
        }
        return label;
    }

    Napi::Value PropertyAperture::GetLabel(const Napi::CallbackInfo &info) {
        return Napi::String::New(info.Env(), GetLabelForValue(value_));
    }

    Napi::Value PropertyAperture::GetValue(const Napi::CallbackInfo &info) {
        return Napi::Number::New(info.Env(), value_);
    }

    Napi::Value PropertyAperture::GetAperture(const Napi::CallbackInfo &info) {
        return Napi::Number::New(info.Env(), f_);
    }

    Napi::Value PropertyAperture::GetPrimitive(const Napi::CallbackInfo &info) {
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

    Napi::Value PropertyAperture::ToJSON(const Napi::CallbackInfo &info) {
        Napi::Env env = info.Env();
        Napi::Object Json = Napi::Object::New(env);
        Json.Set("label", GetLabel(info));
        Json.Set("value", GetValue(info));
        Json.Set("aperture", GetAperture(info));
        return Json;
    }

    Napi::Value PropertyAperture::ToStringTag(const Napi::CallbackInfo &info) {
        return Napi::String::New(info.Env(), "PropertyAperture");
    }

    Napi::Value PropertyAperture::Inspect(const Napi::CallbackInfo &info) {
        auto env = info.Env();
        auto stylize = info[1].As<Napi::Object>().Get("stylize").As<Napi::Function>();
        std::string output = stylize.Call(
            {Napi::String::New(env, "PropertyAperture"), Napi::String::New(env, "special")}
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

    Napi::Value PropertyAperture::ForLabel(const Napi::CallbackInfo &info) {
        if (!(info.Length() > 0 && info[0].IsString())) {
            throw Napi::TypeError::New(
                info.Env(), "PropertyAperture::forLabel(): Argument 0 must be a string."
            );
        }
        std::string label = info[0].As<Napi::String>().Utf8Value();
        for (const auto &it : NamedApertureLabels) {
            if (it.second.compare(label) == 0) {
                return PropertyAperture::NewInstance(info.Env(), it.first);
            }
        }
        try {
            double aperture;
            int offset = label.find("f");
            if (offset != std::string::npos) {
                aperture = std::stod(label.substr(offset+1));
            } else {
                aperture = std::stod(label);
            }
            double matchDelta = 9999.0;
            EdsInt32 matchValue = 0;
            for (const auto &it : ApertureValues) {
                double delta = std::abs(aperture - it.second);
                if (delta < matchDelta) {
                    matchDelta = delta;
                    matchValue = it.first;
                }
            }
            return PropertyAperture::NewInstance(info.Env(), matchValue);
        } catch (...) {
            throw Napi::TypeError::New(
                info.Env(), "PropertyAperture::forLabel(): Invalid label value."
            );
        }
    }


    Napi::Object PropertyAperture::NewInstance(Napi::Env env, EdsInt32 value) {
        Napi::EscapableHandleScope scope(env);
        Napi::Object wrap = constructor.New(
            {
                Napi::Number::New(env, value)
            }
        );
        return scope.Escape(napi_value(wrap)).ToObject();
    }

    void PropertyAperture::Init(Napi::Env env, Napi::Object exports) {
        Napi::HandleScope scope(env);

        Napi::Object IDs = Napi::Object::New(env);
        for (const auto &it : NamedApertureLabels) {
            IDs.DefineProperty(
                Napi::PropertyDescriptor::Value(
                    it.second.c_str(), Napi::Number::New(env, it.first), napi_enumerable
                )
            );
        }
        Napi::Object Values = Napi::Object::New(env);
        for (const auto &it : ApertureValues) {
            Values.Set(it.first, it.second);
        }

        std::vector <PropertyDescriptor> properties = {
            InstanceAccessor<&PropertyAperture::GetLabel>("label"),
            InstanceAccessor<&PropertyAperture::GetValue>("value"),
            InstanceAccessor<&PropertyAperture::GetAperture>("aperture"),
            InstanceMethod(Napi::Symbol::WellKnown(env, "toPrimitive"), &PropertyAperture::GetPrimitive),
            InstanceMethod("toJSON", &PropertyAperture::ToJSON),

            InstanceAccessor<&PropertyAperture::ToStringTag>(Napi::Symbol::WellKnown(env, "toStringTag")),
            InstanceMethod(GetPublicSymbol(env, "nodejs.util.inspect.custom"), &PropertyAperture::Inspect),

            StaticMethod<&PropertyAperture::ForLabel>("forLabel"),

            StaticValue("ID", IDs, napi_enumerable),
            StaticValue("Values", Values, napi_enumerable)
        };

        Napi::Function func = DefineClass(env, "PropertyAperture", properties);
        constructor = Napi::Persistent(func);
        constructor.SuppressDestruct();

        exports.Set("PropertyAperture", func);
    }
}