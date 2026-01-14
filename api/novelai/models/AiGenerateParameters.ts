/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AiGenerateParameters = {
    stop_sequences?: Array<Array<number>>;
    bad_words_ids?: Array<Array<number>>;
    line_start_ids?: Array<Array<number>>;
    /**
     * If false, input and output strings should be Base64-encoded uint16 numbers representing tokens
     */
    use_string?: boolean;
    logit_bias?: Array<Array<number>>;
    logit_bias_exp?: Array<{
        sequence: Array<number>;
        bias: number;
        ensure_sequence_finish?: boolean;
        generate_once?: boolean;
    }>;
    order?: Array<number>;
    repetition_penalty_whitelist?: Array<number>;
    temperature?: number;
    min_length: number;
    max_length: number;
    do_sample?: boolean;
    early_stopping?: boolean;
    num_beams?: number;
    top_k?: number;
    top_a?: number;
    top_p?: number;
    typical_p?: number;
    repetition_penalty?: number;
    pad_token_id?: number;
    bos_token_id?: number;
    eos_token_id?: number;
    length_penalty?: number;
    no_repeat_ngram_size?: number;
    encoder_no_repeat_ngram_size?: number;
    num_return_sequences?: number;
    force_emotion: boolean;
    max_time?: number;
    use_cache?: boolean;
    num_beam_groups?: number;
    diversity_penalty?: number;
    tail_free_sampling?: number;
    repetition_penalty_range?: number;
    repetition_penalty_slope?: number;
    get_hidden_states?: boolean;
    repetition_penalty_frequency?: number;
    repetition_penalty_presence?: number;
    next_word?: boolean;
    prefix?: string;
    output_nonzero_probs?: boolean;
    generate_until_sentence?: boolean;
    num_logprobs?: number;
    cfg_uc?: string;
    cfg_scale?: number;
    cfg_alpha?: number;
    phrase_rep_pen?: string;
    top_g?: number;
    mirostat_tau?: number;
    mirostat_lr?: number;
};

